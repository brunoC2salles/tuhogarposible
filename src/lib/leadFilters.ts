import { Lead } from '@/types/crm';

export type CallTimeFilter = 'manana' | 'tarde' | 'noche';

/** Extrae la hora (0-23, Madrid) de la preferencia de llamada del lead */
export const getLeadCallHour = (lead: Lead): number | null => {
  const raw = lead.hora_reunion || lead.hora_reunion_texto || '';
  const m = raw.match(/(\d{1,2})[:h.](\d{2})/) || raw.match(/^(\d{1,2})$/);
  if (m) {
    const h = parseInt(m[1], 10);
    if (h >= 0 && h <= 23) return h;
  }
  if (lead.reunion_datetime) {
    const parts = new Intl.DateTimeFormat('es-ES', {
      timeZone: lead.zona_horaria_reunion || 'Europe/Madrid',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date(lead.reunion_datetime));
    const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '', 10);
    if (!isNaN(h) && h <= 23) return h;
  }
  return null;
};

export const matchesCallTime = (lead: Lead, filter: CallTimeFilter): boolean => {
  const h = getLeadCallHour(lead);
  if (h === null) return false;
  if (filter === 'manana') return h < 13;
  if (filter === 'tarde') return h >= 13 && h < 16;
  return h >= 16 && h < 21;
};

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** true si el lead declaró que ya tiene una vivienda seleccionada */
export const tieneVivienda = (lead: Lead): boolean => {
  const hip = lead.simulador_hipotecario_data as any;
  let valor: string | null = hip?.meta_vivienda_seleccionada ?? null;

  if (!valor && lead.notas) {
    const m = lead.notas.match(/Vivienda seleccionada:\s*(.+)/i);
    if (m) valor = m[1];
  }
  if (!valor) return false;

  const v = normalize(String(valor));
  return v === 'si' || v === 's' || v === 'yes' || v === '1' || v === 'true' || v.startsWith('si ');
};
