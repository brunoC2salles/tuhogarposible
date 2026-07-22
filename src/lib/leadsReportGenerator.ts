import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';

// Genera el informe de cualificación de leads en PDF.
// Períodos por días de calendario en Europe/Madrid (regla del proyecto).

const MADRID_TZ = 'Europe/Madrid';

// YYYY-MM-DD de un Date en zona Madrid
function toMadridISODate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Marca UTC que representa el inicio (00:00 Madrid) del día YYYY-MM-DD indicado.
// Usamos un enfoque simple: buscar por rango UTC amplio y luego reclasificar por día Madrid en cliente.
function madridDayOfIso(iso: string): string {
  return toMadridISODate(new Date(iso));
}

export function defaultLast7Days(): { start: string; end: string } {
  const today = new Date();
  const end = toMadridISODate(today);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 6);
  return { start: toMadridISODate(start), end };
}

const DISQUAL_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'Edad fuera de rango (>60)', regex: /edad|mayor de 60|60 años|60 anos/i },
  { label: 'Ingresos insuficientes (<1.200€)', regex: /ingreso|salario|nómina|nomina|renta/i },
  { label: 'Ahorros insuficientes (<2.500€)', regex: /ahorr|economias|econom[íi]as/i },
  { label: 'Antigüedad laboral < 1 año', regex: /antig[üu]edad|contrato.*(menos|<|inferior)|menos de 1 año|menos de un año/i },
  { label: 'Sin contrato / autónomo no elegible', regex: /sin contrato|autonomo|aut[óo]nomo/i },
  { label: 'Deudas / impagos', regex: /deuda|impag|asnef|moros/i },
  { label: 'Duplicado', regex: /duplicad/i },
];

interface ReportData {
  start: string;
  end: string;
  totalLeads: number;
  qualified: number;
  disqualified: number;
  bitrixSent: number;
  byDay: { dia: string; total: number; cualificados: number; descualificados: number }[];
  bySource: { source: string; total: number; cualificados: number; descualificados: number }[];
  disqualReasons: { motivo: string; count: number }[];
  unclassifiedDisqual: number;
}

async function fetchReportData(start: string, end: string): Promise<ReportData> {
  // Rango UTC generoso para cubrir todo el rango Madrid (Madrid = UTC+1/+2)
  // start 00:00 Madrid ~ start-1 22:00 UTC como muy pronto → usamos start T00 UTC menos 1 día para seguridad
  const startUtc = `${start}T00:00:00Z`;
  const endDate = new Date(`${end}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 2); // +2 días de margen
  const endUtc = endDate.toISOString();

  const leads = await fetchAllPaginated<any>((from, to) =>
    supabase.from('leads')
      .select('id, stage, source, notas, created_at')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc)
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  // Filtrar por día Madrid dentro del rango
  const filtered = leads.filter(l => {
    const dia = madridDayOfIso(l.created_at);
    return dia >= start && dia <= end;
  });

  const totalLeads = filtered.length;
  const disqualified = filtered.filter(l => l.stage === 'descualificados').length;
  const qualified = totalLeads - disqualified;

  // Por día
  const dayMap = new Map<string, { total: number; cualificados: number; descualificados: number }>();
  filtered.forEach(l => {
    const dia = madridDayOfIso(l.created_at);
    if (!dayMap.has(dia)) dayMap.set(dia, { total: 0, cualificados: 0, descualificados: 0 });
    const b = dayMap.get(dia)!;
    b.total++;
    if (l.stage === 'descualificados') b.descualificados++; else b.cualificados++;
  });
  const byDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({ dia, ...v }));

  // Por fuente
  const srcMap = new Map<string, { total: number; cualificados: number; descualificados: number }>();
  filtered.forEach(l => {
    const src = l.source || 'sin_fuente';
    if (!srcMap.has(src)) srcMap.set(src, { total: 0, cualificados: 0, descualificados: 0 });
    const b = srcMap.get(src)!;
    b.total++;
    if (l.stage === 'descualificados') b.descualificados++; else b.cualificados++;
  });
  const bySource = Array.from(srcMap.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([source, v]) => ({ source, ...v }));

  // Motivos de descualificación (parseando notas)
  const reasonMap = new Map<string, number>();
  let unclassifiedDisqual = 0;
  filtered.filter(l => l.stage === 'descualificados').forEach(l => {
    const notas = (l.notas || '').toString();
    let matched = false;
    for (const p of DISQUAL_PATTERNS) {
      if (p.regex.test(notas)) {
        reasonMap.set(p.label, (reasonMap.get(p.label) || 0) + 1);
        matched = true;
        // Solo una razón principal por lead (evita doble conteo)
        break;
      }
    }
    if (!matched) unclassifiedDisqual++;
  });
  const disqualReasons = Array.from(reasonMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([motivo, count]) => ({ motivo, count }));

  // Cruzamiento con webhook_logs (Bitrix) — cuenta envíos success en el rango
  const { count: bitrixCount } = await supabase
    .from('webhook_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success')
    .ilike('webhook_url', '%meta%bitrix%')
    .gte('created_at', startUtc)
    .lt('created_at', endUtc);

  return {
    start, end,
    totalLeads, qualified, disqualified,
    bitrixSent: bitrixCount ?? 0,
    byDay, bySource, disqualReasons, unclassifiedDisqual,
  };
}

function fmtDateEs(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function sourceLabel(s: string): string {
  const map: Record<string, string> = {
    meta_ads: 'Meta Ads',
    tally: 'Tally',
    manual: 'Manual',
    formulario_web: 'Formulario Web',
    tidycal_webhook: 'TidyCal',
    sin_fuente: 'Sin fuente',
  };
  return map[s] || s;
}

function buildPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Título
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 255);
  doc.text('Informe de Cualificación de Leads', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Período: ${fmtDateEs(data.start)} — ${fmtDateEs(data.end)} (días de calendario, Europe/Madrid)`, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado el ${new Date().toLocaleString('es-ES', { timeZone: MADRID_TZ })}`, margin, y);
  y += 8;

  // Resumen ejecutivo
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text('Resumen ejecutivo', margin, y);
  y += 2;

  const tasa = data.totalLeads > 0 ? ((data.qualified / data.totalLeads) * 100).toFixed(1) : '0.0';
  autoTable(doc, {
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de leads recibidos', String(data.totalLeads)],
      ['Cualificados', String(data.qualified)],
      ['Descualificados', String(data.disqualified)],
      ['Tasa de cualificación', `${tasa}%`],
      ['Envíos exitosos al Bitrix (Meta → Bitrix)', String(data.bitrixSent)],
    ],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Por día
  doc.setFontSize(13);
  doc.text('Leads por día', margin, y);
  autoTable(doc, {
    startY: y + 2,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Fecha', 'Total', 'Cualificados', 'Descualificados']],
    body: data.byDay.length > 0
      ? data.byDay.map(r => [fmtDateEs(r.dia), r.total, r.cualificados, r.descualificados])
      : [['Sin datos en el período', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (y > 240) { doc.addPage(); y = margin; }

  // Por fuente
  doc.setFontSize(13);
  doc.text('Leads por fuente', margin, y);
  autoTable(doc, {
    startY: y + 2,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Fuente', 'Total', 'Cualificados', 'Descualificados']],
    body: data.bySource.length > 0
      ? data.bySource.map(r => [sourceLabel(r.source), r.total, r.cualificados, r.descualificados])
      : [['Sin datos en el período', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (y > 220) { doc.addPage(); y = margin; }

  // Motivos de descualificación
  doc.setFontSize(13);
  doc.text('Motivos de descualificación', margin, y);
  const reasonRows: any[] = data.disqualReasons.map(r => [r.motivo, r.count]);
  if (data.unclassifiedDisqual > 0) {
    reasonRows.push(['Otros / sin motivo claro en notas', data.unclassifiedDisqual]);
  }
  autoTable(doc, {
    startY: y + 2,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Motivo', 'Nº de leads']],
    body: reasonRows.length > 0 ? reasonRows : [['Sin descualificados en el período', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Nota metodológica
  if (y > 260) { doc.addPage(); y = margin; }
  doc.setFontSize(9);
  doc.setTextColor(120);
  const nota =
    'Metodología: los cortes se calculan por día de calendario en la zona horaria Europe/Madrid. ' +
    'Un lead se considera cualificado si su estado actual es distinto de "descualificados". ' +
    'Los motivos de descualificación se extraen del campo "notas" del lead mediante patrones estándar.';
  const lines = doc.splitTextToSize(nota, pageWidth - margin * 2);
  doc.text(lines, margin, y);

  return doc;
}

export async function generateLeadsReport(start: string, end: string): Promise<{ filename: string; blob: Blob }> {
  const data = await fetchReportData(start, end);
  const doc = buildPdf(data);
  const filename = `informe_leads_${data.start}_${data.end}.pdf`;
  const blob = doc.output('blob');
  return { filename, blob };
}
