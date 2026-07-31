import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';

// Genera el informe de cualificación de leads en PDF.
// Cortes por día de calendario en Europe/Madrid (regla del proyecto).

const MADRID_TZ = 'Europe/Madrid';

function toMadridISODate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

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

// ============ Parser de notas ============

interface ParsedNotes {
  motivoDesc: string | null;   // texto tras "NO CUALIFICADO - "
  edad: number | null;
  ciudad: string | null;       // Ciudad detectada > Zona
  antiguedad: string | null;
  dniNie: 'dni' | 'nie' | null;
  ahorros: number | null;      // parseado a €, null si "no"/vacío
  ahorrosTexto: string | null; // "no", "sí", numérico bruto
}

function normalizeCity(raw: string): string {
  const s = raw.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // quitar duplicaciones simples "murcia, murcia"
  const first = s.split(/[,;/]/)[0].trim();
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function parseAhorrosTexto(txt: string): number | null {
  const t = txt.trim().toLowerCase();
  if (!t || /^no+$/.test(t) || t === '-' || t === 'ninguno') return 0;
  if (/^s[íi]$/.test(t) || /^yes$/.test(t)) return null; // afirmativo sin monto
  // extraer dígitos, soportar k/mil
  const kMatch = t.match(/^(\d+(?:[.,]\d+)?)\s*(k|mil)/);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(',', '.'));
    return Math.round(n * 1000);
  }
  const numMatch = t.match(/(\d[\d.,]*)/);
  if (numMatch) {
    let raw = numMatch[1];
    // "5.000" o "10,000" son miles; "5,5" es decimal
    if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
      raw = raw.replace(/[.,]/g, '');
      return parseInt(raw, 10);
    }
    const n = parseFloat(raw.replace(',', '.'));
    if (!isNaN(n)) {
      // heurística: número corto entre 5 y 100 → miles
      if (n >= 5 && n <= 100 && !raw.includes('.') && !raw.includes(',')) {
        return Math.round(n * 1000);
      }
      return Math.round(n);
    }
  }
  return null;
}

function parseNotas(notas: string | null | undefined): ParsedNotes {
  const out: ParsedNotes = {
    motivoDesc: null, edad: null, ciudad: null,
    antiguedad: null, dniNie: null, ahorros: null, ahorrosTexto: null,
  };
  if (!notas) return out;

  const line = (label: string): string | null => {
    const re = new RegExp(`${label}\\s*:\\s*([^\\n\\r]+)`, 'i');
    const m = notas.match(re);
    return m ? m[1].trim() : null;
  };

  const noCual = notas.match(/NO CUALIFICADO\s*-\s*([^\n\r]+)/i);
  if (noCual) out.motivoDesc = noCual[1].trim();

  const edadStr = line('Edad');
  if (edadStr) {
    const n = parseInt(edadStr, 10);
    if (!isNaN(n)) out.edad = n;
  }

  const ciudadDet = line('Ciudad detectada');
  const zona = line('Zona');
  if (ciudadDet) out.ciudad = normalizeCity(ciudadDet);
  else if (zona) out.ciudad = normalizeCity(zona);

  const ant = line('Antigüedad');
  if (ant) out.antiguedad = ant.toLowerCase().replace(/_/g, ' ').trim();

  const dni = line('DNI/NIE');
  if (dni) {
    const v = dni.toLowerCase();
    if (v.includes('nie')) out.dniNie = 'nie';
    else if (v.includes('dni')) out.dniNie = 'dni';
  }

  const ahorros = line('Ahorros para impuestos');
  if (ahorros) {
    // formato típico: "5000 € - 5000 €€" o "no - no€"
    const primero = ahorros.split('-')[0].trim();
    out.ahorrosTexto = primero;
    out.ahorros = parseAhorrosTexto(primero);
  }

  return out;
}

// ============ Categorización ============

function categorizeMotivo(raw: string | null): string {
  if (!raw) return 'Sin motivo registrado';
  const s = raw.toLowerCase();
  if (s.includes('antig')) return 'Antigüedad laboral insuficiente (<1 año)';
  if (s.includes('ahorro')) return 'Ahorros insuficientes (<5.000€)';
  if (s.includes('morosidad') || s.includes('asnef') || s.includes('impag')) return 'Fichero de morosidad';
  if (s.includes('ingreso')) return 'Ingresos insuficientes (<1.200€)';
  if (s.includes('edad')) return 'Edad superior a 60 años';
  if (s.includes('deuda')) return 'Porcentaje de deuda ≥30% de ingresos';
  if (s.includes('dni') || s.includes('nie')) return 'Sin DNI/NIE';
  if (s.includes('contrato')) return 'Contrato precario';
  if (s.includes('duplicad')) return 'Duplicado';
  return raw.length > 60 ? raw.slice(0, 57) + '…' : raw;
}

function categorizeAntiguedad(raw: string | null): string {
  if (!raw) return 'Sin dato';
  const s = raw.toLowerCase();
  if (s.includes('menos de 1')) return 'Menos de 1 año';
  if (s.includes('más de 1') || s.includes('mas de 1') || s.includes('indefinido')) return 'Indefinido / >1 año';
  if (s.includes('temporal') || s.includes('fijo discontinuo') || s.includes('obra')) return 'Temporal / fijo discontinuo';
  if (s.includes('autonom') || s.includes('autónom')) return 'Autónomo';
  if (s.includes('formacion') || s.includes('formación') || s.includes('práctica') || s.includes('practica')) return 'Formación / prácticas';
  return raw.length > 40 ? raw.slice(0, 37) + '…' : raw;
}

function bucketEdad(n: number | null): string {
  if (n == null) return 'Sin dato';
  if (n < 25) return '<25';
  if (n <= 34) return '25-34';
  if (n <= 44) return '35-44';
  if (n <= 54) return '45-54';
  if (n <= 60) return '55-60';
  return '>60';
}

function bucketAhorros(n: number | null, texto: string | null): string {
  if (n == null && !texto) return 'Sin dato';
  if (n == null && texto) {
    if (/^s[íi]|^yes/i.test(texto)) return 'Afirmativo sin monto';
    return 'Sin dato';
  }
  if (n === 0) return '0€';
  if ((n ?? 0) < 1000) return '1-999€';
  if ((n ?? 0) < 2500) return '1.000-2.499€';
  if ((n ?? 0) < 5000) return '2.500-4.999€';
  return '≥5.000€';
}

// ============ Fetch de datos ============

interface DayBucket { total: number; cualificados: number; descualificados: number; }
interface ReportData {
  start: string; end: string;
  totalLeads: number; qualified: number; disqualified: number;
  bitrixSent: number;
  byDay: { dia: string; total: number; cualificados: number; descualificados: number }[];
  bySource: { source: string; total: number; cualificados: number; descualificados: number }[];
  disqualReasons: { motivo: string; count: number }[];
  topCities: { ciudad: string; total: number; cualificados: number; descualificados: number }[];
  edadDist: { bucket: string; total: number; cualificados: number; descualificados: number }[];
  antigDist: { categoria: string; total: number; cualificados: number; descualificados: number }[];
  ahorrosDist: { bucket: string; total: number; cualificados: number; descualificados: number }[];
  dniNieDist: { tipo: string; total: number; cualificados: number; descualificados: number }[];
  ciudadesSinDato: number;
}

async function fetchReportData(start: string, end: string): Promise<ReportData> {
  // Janela UTC ampliada (start-1, end+2) para cobrir todo o dia de calendário Madrid
  const startDate = new Date(`${start}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 1);
  const endDate = new Date(`${end}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 2);
  const startUtc = startDate.toISOString();
  const endUtc = endDate.toISOString();

  const leads = await fetchAllPaginated<any>((from, to) =>
    supabase.from('leads')
      .select('id, stage, source, notas, ciudad_interes, created_at')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc)
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  const filtered = leads.filter(l => {
    const dia = madridDayOfIso(l.created_at);
    return dia >= start && dia <= end;
  });

  const totalLeads = filtered.length;
  const disqualified = filtered.filter(l => l.stage === 'descualificados').length;
  const qualified = totalLeads - disqualified;

  // Utilidad para acumular
  const bumpMap = (map: Map<string, DayBucket>, key: string, isDesc: boolean) => {
    if (!map.has(key)) map.set(key, { total: 0, cualificados: 0, descualificados: 0 });
    const b = map.get(key)!;
    b.total++;
    if (isDesc) b.descualificados++; else b.cualificados++;
  };

  const dayMap = new Map<string, DayBucket>();
  const srcMap = new Map<string, DayBucket>();
  const cityMap = new Map<string, DayBucket>();
  const edadMap = new Map<string, DayBucket>();
  const antigMap = new Map<string, DayBucket>();
  const ahorrosMap = new Map<string, DayBucket>();
  const dniMap = new Map<string, DayBucket>();
  const reasonMap = new Map<string, number>();
  let ciudadesSinDato = 0;

  filtered.forEach(l => {
    const isDesc = l.stage === 'descualificados';
    const p = parseNotas(l.notas);

    bumpMap(dayMap, madridDayOfIso(l.created_at), isDesc);
    bumpMap(srcMap, l.source || 'sin_fuente', isDesc);

    const ciudad = p.ciudad || (l.ciudad_interes ? normalizeCity(l.ciudad_interes) : null);
    if (ciudad) bumpMap(cityMap, ciudad, isDesc);
    else ciudadesSinDato++;

    bumpMap(edadMap, bucketEdad(p.edad), isDesc);
    bumpMap(antigMap, categorizeAntiguedad(p.antiguedad), isDesc);
    bumpMap(ahorrosMap, bucketAhorros(p.ahorros, p.ahorrosTexto), isDesc);
    bumpMap(dniMap, p.dniNie ? p.dniNie.toUpperCase() : 'Sin dato', isDesc);

    if (isDesc) {
      const cat = categorizeMotivo(p.motivoDesc);
      reasonMap.set(cat, (reasonMap.get(cat) || 0) + 1);
    }
  });

  const toArr = <T extends string>(m: Map<T, DayBucket>) =>
    Array.from(m.entries()).map(([k, v]) => ({ key: k, ...v }));

  const byDay = toArr(dayMap).sort((a, b) => a.key.localeCompare(b.key))
    .map(x => ({ dia: x.key, total: x.total, cualificados: x.cualificados, descualificados: x.descualificados }));
  const bySource = toArr(srcMap).sort((a, b) => b.total - a.total)
    .map(x => ({ source: x.key, total: x.total, cualificados: x.cualificados, descualificados: x.descualificados }));
  const topCities = toArr(cityMap).sort((a, b) => b.total - a.total).slice(0, 15)
    .map(x => ({ ciudad: x.key, total: x.total, cualificados: x.cualificados, descualificados: x.descualificados }));

  const edadOrder = ['<25', '25-34', '35-44', '45-54', '55-60', '>60', 'Sin dato'];
  const edadDist = edadOrder
    .filter(b => edadMap.has(b))
    .map(b => ({ bucket: b, ...edadMap.get(b)! }));

  const antigDist = toArr(antigMap).sort((a, b) => b.total - a.total)
    .map(x => ({ categoria: x.key, total: x.total, cualificados: x.cualificados, descualificados: x.descualificados }));

  const ahorrosOrder = ['0€', '1-999€', '1.000-2.499€', '2.500-4.999€', '≥5.000€', 'Afirmativo sin monto', 'Sin dato'];
  const ahorrosDist = ahorrosOrder
    .filter(b => ahorrosMap.has(b))
    .map(b => ({ bucket: b, ...ahorrosMap.get(b)! }));

  const dniNieDist = toArr(dniMap).sort((a, b) => b.total - a.total)
    .map(x => ({ tipo: x.key, total: x.total, cualificados: x.cualificados, descualificados: x.descualificados }));

  const disqualReasons = Array.from(reasonMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([motivo, count]) => ({ motivo, count }));

  // Bitrix: contar envíos success cuyo created_at cae en un día Madrid del período
  const logs = await fetchAllPaginated<any>((from, to) =>
    supabase.from('webhook_logs')
      .select('id, created_at, webhook_url, status')
      .eq('status', 'success')
      .ilike('webhook_url', '%meta%bitrix%')
      .gte('created_at', startUtc)
      .lt('created_at', endUtc)
      .order('created_at', { ascending: true })
      .range(from, to)
  );
  const bitrixSent = logs.filter(l => {
    const d = madridDayOfIso(l.created_at);
    return d >= start && d <= end;
  }).length;

  return {
    start, end, totalLeads, qualified, disqualified, bitrixSent,
    byDay, bySource, disqualReasons, topCities,
    edadDist, antigDist, ahorrosDist, dniNieDist, ciudadesSinDato,
  };
}

// ============ PDF ============

function fmtDateEs(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function sourceLabel(s: string): string {
  const map: Record<string, string> = {
    meta_ads: 'Meta Ads', tally: 'Tally', manual: 'Manual',
    formulario_web: 'Formulario Web', tidycal_webhook: 'TidyCal', sin_fuente: 'Sin fuente',
  };
  return map[s] || s;
}

function pct(n: number, total: number): string {
  if (!total) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function buildPdf(data: ReportData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) { doc.addPage(); y = margin; }
  };

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

  const tasa = pct(data.qualified, data.totalLeads);

  // Resumen ejecutivo
  doc.setFontSize(13); doc.setTextColor(0);
  doc.text('Resumen ejecutivo', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de leads recibidos', String(data.totalLeads)],
      ['Cualificados', String(data.qualified)],
      ['Descualificados', String(data.disqualified)],
      ['Tasa de cualificación', tasa],
      ['Envíos exitosos al Bitrix (incluye reintentos)', String(data.bitrixSent)],
    ],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Por día
  ensureSpace(50);
  doc.setFontSize(13); doc.text('Leads por día', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Fecha', 'Total', 'Cualificados', 'Descualificados', '% Cual.']],
    body: data.byDay.length
      ? data.byDay.map(r => [fmtDateEs(r.dia), r.total, r.cualificados, r.descualificados, pct(r.cualificados, r.total)])
      : [['Sin datos', '', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Por fuente
  ensureSpace(40);
  doc.setFontSize(13); doc.text('Leads por fuente', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Fuente', 'Total', 'Cualificados', 'Descualificados', '% Cual.']],
    body: data.bySource.length
      ? data.bySource.map(r => [sourceLabel(r.source), r.total, r.cualificados, r.descualificados, pct(r.cualificados, r.total)])
      : [['Sin datos', '', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Motivos de descualificación
  ensureSpace(50);
  doc.setFontSize(13); doc.text('Motivos de descualificación', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Motivo', 'Nº leads', '% del total desc.']],
    body: data.disqualReasons.length
      ? data.disqualReasons.map(r => [r.motivo, r.count, pct(r.count, data.disqualified)])
      : [['Sin descualificados en el período', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Top ciudades
  ensureSpace(60);
  doc.setFontSize(13); doc.text(`Top ciudades / zonas (${data.topCities.length})`, margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Ciudad', 'Total', 'Cualificados', 'Descualificados', '% Cual.']],
    body: data.topCities.length
      ? data.topCities.map(r => [r.ciudad, r.total, r.cualificados, r.descualificados, pct(r.cualificados, r.total)])
      : [['Sin datos', '', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 2;
  if (data.ciudadesSinDato > 0) {
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Leads sin ciudad detectada: ${data.ciudadesSinDato}`, margin, y + 4);
    y += 6;
  }
  y += 6;

  // Distribución por edad
  ensureSpace(50);
  doc.setFontSize(13); doc.setTextColor(0); doc.text('Distribución por edad', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Franja', 'Total', 'Cualificados', 'Descualificados', '% Cual.']],
    body: data.edadDist.length
      ? data.edadDist.map(r => [r.bucket, r.total, r.cualificados, r.descualificados, pct(r.cualificados, r.total)])
      : [['Sin datos', '', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Antigüedad laboral
  ensureSpace(50);
  doc.setFontSize(13); doc.text('Antigüedad laboral', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Categoría', 'Total', 'Cualificados', 'Descualificados', '% Cual.']],
    body: data.antigDist.length
      ? data.antigDist.map(r => [r.categoria, r.total, r.cualificados, r.descualificados, pct(r.cualificados, r.total)])
      : [['Sin datos', '', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Ahorros declarados
  ensureSpace(50);
  doc.setFontSize(13); doc.text('Ahorros declarados', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Rango', 'Total', 'Cualificados', 'Descualificados', '% Cual.']],
    body: data.ahorrosDist.length
      ? data.ahorrosDist.map(r => [r.bucket, r.total, r.cualificados, r.descualificados, pct(r.cualificados, r.total)])
      : [['Sin datos', '', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // DNI / NIE
  ensureSpace(40);
  doc.setFontSize(13); doc.text('DNI vs NIE', margin, y);
  autoTable(doc, {
    startY: y + 2, theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [0, 0, 255], textColor: 255 },
    head: [['Tipo', 'Total', 'Cualificados', 'Descualificados', '% Cual.']],
    body: data.dniNieDist.length
      ? data.dniNieDist.map(r => [r.tipo, r.total, r.cualificados, r.descualificados, pct(r.cualificados, r.total)])
      : [['Sin datos', '', '', '', '']],
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Metodología
  ensureSpace(30);
  doc.setFontSize(9); doc.setTextColor(120);
  const nota =
    'Metodología: los cortes se calculan por día de calendario en la zona horaria Europe/Madrid. ' +
    'Un lead se considera cualificado si su estado actual es distinto de "descualificados". ' +
    'Los motivos, edad, ciudad, antigüedad laboral, DNI/NIE y ahorros se extraen de los campos estructurados dentro del campo "notas" ' +
    'generado automáticamente por el webhook de Meta Ads (líneas "NO CUALIFICADO - ...", "Edad:", "Zona:", "Ciudad detectada:", "Antigüedad:", "DNI/NIE:", "Ahorros para impuestos:"). ' +
    'La columna "Envíos exitosos al Bitrix" cuenta los POST con status success al webhook Bitrix e incluye reintentos y reprocesos, por lo que puede superar el nº de cualificados únicos.';
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
