// ============================================================================
// SHARED — Resolvedor ÚNICO de fecha/hora de reunión (Europe/Madrid).
//
// Todo lo que sale del sistema (Bitrix vía make-webhook-proxy/meta-lead-webhook
// y WhatsApp vía el webhook secundario) DEBE usar este resolvedor, para que
// ambos canales muestren exactamente el mismo día y la misma hora.
//
// Garantías del resultado:
//  - Instante siempre válido (nunca NaN, nunca 1969) y SIEMPRE en el futuro.
//  - Hora dentro de la franja laboral 08:00–20:00 (Madrid).
//  - Día laborable (nunca sábado ni domingo).
//  - `fecha` / `hora` / `iso` / `bitrix` siempre coherentes entre sí.
// ============================================================================

const TZ = 'Europe/Madrid';
const WORK_START = 8;
const WORK_END = 20;
const DEFAULT_HOUR = 11;

export interface ResolvedReunion {
  /** YYYY-MM-DD (Madrid) */
  fecha: string;
  /** HH:mm:ss (Madrid) */
  hora: string;
  /** ISO UTC del instante */
  iso: string;
  /** YYYY-MM-DDTHH:mm:ss — formato que el campo fecha+hora de Bitrix acepta */
  bitrix: string;
  /**
   * true cuando la hora (o la fecha) no vino del lead y la asignamos nosotros:
   * el agente debe confirmar con el cliente.
   */
  pendiente: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Offset de Europe/Madrid (en minutos) para un instante UTC. */
export function madridOffsetMinutes(utcMs: number): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return (asUtc - utcMs) / 60000;
}

/** Convierte fecha (YYYY-MM-DD) + hora local de Madrid en ISO UTC válido. */
export function madridToIso(fecha: string, hora: string): string | null {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm, ss] = hora.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh)) return null;
  let guess = Date.UTC(y, m - 1, d, hh, mm || 0, ss || 0);
  for (let i = 0; i < 2; i++) {
    const off = madridOffsetMinutes(guess);
    guess = Date.UTC(y, m - 1, d, hh, mm || 0, ss || 0) - off * 60000;
  }
  const dt = new Date(guess);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

/** Partes locales de Madrid para un instante. */
function madridParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
  };
}

function addDays(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function weekday(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dom, 6=sáb
}

function nextBusinessDay(fecha: string, includeSame: boolean): string {
  let cur = includeSame ? fecha : addDays(fecha, 1);
  for (let i = 0; i < 8; i++) {
    if (weekday(cur) !== 0 && weekday(cur) !== 6) return cur;
    cur = addDays(cur, 1);
  }
  return cur;
}

function parseHora(hora: unknown): { h: number; m: number } | null {
  if (hora === null || hora === undefined) return null;
  const match = String(hora).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || h < 0 || h > 23 || Number.isNaN(m) || m < 0 || m > 59) return null;
  return { h, m };
}

function parseFecha(fecha: unknown): string | null {
  if (!fecha) return null;
  const match = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Resuelve el día y la hora definitivos de la reunión de un lead.
 * Fuentes, por orden de preferencia: `reunion_datetime` → `fecha_reunion` +
 * `hora_reunion` → `fecha_reunion` (hora por defecto) → siguiente día laborable.
 */
export function resolveReunion(lead: Record<string, any>, base: Date = new Date()): ResolvedReunion {
  let fecha: string | null = null;
  let h: number | null = null;
  let m = 0;
  let pendiente = false;

  // 1) Instante ya guardado (fuente preferente: la BD ya lo normalizó)
  if (lead?.reunion_datetime) {
    const d = new Date(lead.reunion_datetime);
    if (!isNaN(d.getTime()) && d.getUTCFullYear() > 2000) {
      const p = madridParts(d);
      fecha = p.fecha;
      h = p.hour;
      m = p.minute;
    }
  }

  // 2) Columnas separadas
  if (fecha === null) {
    fecha = parseFecha(lead?.fecha_reunion);
    if (fecha) {
      const parsed = parseHora(lead?.hora_reunion);
      if (parsed) {
        h = parsed.h;
        m = parsed.m;
      } else {
        h = DEFAULT_HOUR;
        m = 0;
        pendiente = true;
      }
    }
  }

  // 3) Sin nada utilizable → siguiente día laborable a las 11:00
  const nowParts = madridParts(base);
  if (fecha === null || h === null) {
    fecha = nextBusinessDay(nowParts.fecha, false);
    h = DEFAULT_HOUR;
    m = 0;
    pendiente = true;
  }

  // 4) Franja laboral
  if (h < WORK_START || h >= WORK_END) {
    h = DEFAULT_HOUR;
    m = 0;
    pendiente = true;
  }

  // 5) Nunca fin de semana
  if (weekday(fecha) === 0 || weekday(fecha) === 6) {
    fecha = nextBusinessDay(fecha, false);
    pendiente = true;
  }

  // 6) Nunca en el pasado: empuja al siguiente día laborable manteniendo la hora
  let iso = madridToIso(fecha, `${pad(h)}:${pad(m)}:00`);
  let guard = 0;
  while ((!iso || new Date(iso).getTime() <= base.getTime()) && guard < 10) {
    fecha = nextBusinessDay(fecha, false);
    iso = madridToIso(fecha, `${pad(h)}:${pad(m)}:00`);
    pendiente = true;
    guard++;
  }

  const hora = `${pad(h)}:${pad(m)}:00`;
  return {
    fecha,
    hora,
    iso: iso ?? new Date(base.getTime() + 24 * 3600 * 1000).toISOString(),
    bitrix: `${fecha}T${hora}`,
    pendiente,
  };
}
