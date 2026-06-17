// ============================================================================
// parseReunionDateTime — parser robusto para a resposta livre do lead sobre
// dia/hora da reunião (formulário Meta Ads).
//
// Garante que sempre retorna {fecha, hora} válidos (com defaults). Timezone
// fixo Europe/Madrid (o builder Bitrix já trata o offset).
//
// Saídas:
//   fecha:      YYYY-MM-DD
//   hora:       HH:mm:ss
//   confidence: 'high' | 'medium' | 'low'
//     high   = dia e hora explícitos
//     medium = um dos dois extraído (outro foi inferido)
//     low    = nada extraído (caiu no default: próximo dia útil 10:00)
// ============================================================================

export interface ParsedReunion {
  fecha: string;          // YYYY-MM-DD
  hora: string;           // HH:mm:ss
  confidence: 'high' | 'medium' | 'low';
  rawInput: string;
}

const HORA_MANANA = '10:00:00';
const HORA_TARDE = '15:00:00';
const HORA_NOCHE = '19:00:00';
const HORA_DEFAULT = '10:00:00';

const DOW_MAP: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1, segunda: 1,
  martes: 2, mar: 2, terca: 2,
  miercoles: 3, mier: 3, quarta: 3,
  jueves: 4, jue: 4, quinta: 4,
  viernes: 5, vie: 5, sexta: 5,
  sabado: 6, sab: 6,
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalYMD(d: Date): string {
  // Trabalhamos em "wall clock" Europe/Madrid via Intl
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(d); // YYYY-MM-DD
}

function todayInMadrid(base: Date): { y: number; m: number; d: number; dow: number } {
  const ymd = toLocalYMD(base);
  const [y, m, d] = ymd.split('-').map(Number);
  // Dia da semana em Madrid
  const dowFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' });
  const dowStr = dowFmt.format(base);
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y, m, d, dow: dowMap[dowStr] ?? 1 };
}

function addDays(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function nextWeekday(y: number, m: number, d: number, targetDow: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const curDow = dt.getUTCDay();
  let diff = (targetDow - curDow + 7) % 7;
  if (diff === 0) diff = 7; // sempre próxima ocorrência, nunca hoje
  dt.setUTCDate(dt.getUTCDate() + diff);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function nextBusinessDay(y: number, m: number, d: number, includeToday: boolean): { y: number; m: number; d: number } {
  let cur = { y, m, d };
  if (!includeToday) cur = addDays(y, m, d, 1);
  for (let i = 0; i < 7; i++) {
    const dow = new Date(Date.UTC(cur.y, cur.m - 1, cur.d)).getUTCDay();
    if (dow !== 0 && dow !== 6) return cur;
    cur = addDays(cur.y, cur.m, cur.d, 1);
  }
  return cur;
}

function isWeekend(y: number, m: number, d: number): boolean {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

function ymdToString(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

interface HoraExtract {
  hora: string | null;
  hadPeriod: boolean; // mañana/tarde/noche detectado
  hadExplicit: boolean; // número de hora encontrado
}

function extractHora(text: string): HoraExtract {
  const hadMañana = /\b(manana|manha|mañana|morning)\b/.test(text);
  const hadTarde = /\b(tarde|afternoon)\b/.test(text);
  const hadNoche = /\b(noche|noite|evening|night)\b/.test(text);
  const hadPeriod = hadMañana || hadTarde || hadNoche;

  // HH:mm ou HHh ou HHhMM ou HH.MM
  let h: number | null = null;
  let mm = 0;

  const ampm = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  const colon = text.match(/\b(\d{1,2}):(\d{2})\b/);
  const hFmt = text.match(/\b(\d{1,2})\s*h(?:\s*(\d{2}))?\b/);
  const dot = text.match(/\b(\d{1,2})\.(\d{2})\b/);
  const onlyH = text.match(/\b(\d{1,2})\s*(?:hs?|horas?)?\b(?!\d)/);

  if (ampm) {
    h = parseInt(ampm[1], 10);
    mm = parseInt(ampm[2], 10);
    if (ampm[3] === 'pm' && h < 12) h += 12;
    if (ampm[3] === 'am' && h === 12) h = 0;
  } else if (colon) {
    h = parseInt(colon[1], 10);
    mm = parseInt(colon[2], 10);
  } else if (hFmt) {
    h = parseInt(hFmt[1], 10);
    mm = hFmt[2] ? parseInt(hFmt[2], 10) : 0;
  } else if (dot) {
    h = parseInt(dot[1], 10);
    mm = parseInt(dot[2], 10);
  } else if (onlyH) {
    // Só aceita "12h"/"a las 12" se não for parte de uma data já consumida; verifica range válido
    const candidate = parseInt(onlyH[1], 10);
    // Evita pegar dia do mês (ex: "25" em "25/06"). Só aceita 0-23.
    if (candidate >= 0 && candidate <= 23) {
      h = candidate;
    }
  }

  if (h === null) {
    if (hadMañana) return { hora: HORA_MANANA, hadPeriod, hadExplicit: false };
    if (hadTarde) return { hora: HORA_TARDE, hadPeriod, hadExplicit: false };
    if (hadNoche) return { hora: HORA_NOCHE, hadPeriod, hadExplicit: false };
    return { hora: null, hadPeriod, hadExplicit: false };
  }

  // Heurística: "4 de la tarde" → 16; "8 de la noche" → 20
  if ((hadTarde || hadNoche) && h < 12) h += 12;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) {
    return { hora: null, hadPeriod, hadExplicit: false };
  }
  return { hora: `${pad(h)}:${pad(mm)}:00`, hadPeriod, hadExplicit: true };
}

interface FechaExtract {
  ymd: { y: number; m: number; d: number } | null;
  hadExplicit: boolean;
  mentionedWeekend: boolean;
}

function extractFecha(text: string, base: Date): FechaExtract {
  const today = todayInMadrid(base);

  // dd/mm/yyyy ou dd/mm
  const dmy = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (dmy) {
    const dd = parseInt(dmy[1], 10);
    const mm = parseInt(dmy[2], 10);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      let yy = dmy[3] ? parseInt(dmy[3], 10) : today.y;
      if (yy < 100) yy += 2000;
      // Se data já passou e ano não foi explícito, soma 1
      if (!dmy[3]) {
        const cand = new Date(Date.UTC(yy, mm - 1, dd));
        const todayDt = new Date(Date.UTC(today.y, today.m - 1, today.d));
        if (cand < todayDt) yy += 1;
      }
      return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, mentionedWeekend: false };
    }
  }

  // pasado mañana
  if (/\bpasado\s+manana\b/.test(text) || /\baftertomorrow\b/.test(text)) {
    return { ymd: addDays(today.y, today.m, today.d, 2), hadExplicit: true, mentionedWeekend: false };
  }

  // hoy / today
  if (/\b(hoy|today|hoje)\b/.test(text)) {
    return { ymd: { y: today.y, m: today.m, d: today.d }, hadExplicit: true, mentionedWeekend: false };
  }

  // dia da semana (lunes, martes, ...)
  for (const [word, dow] of Object.entries(DOW_MAP)) {
    const re = new RegExp(`\\b${word}\\b`);
    if (re.test(text)) {
      return {
        ymd: nextWeekday(today.y, today.m, today.d, dow),
        hadExplicit: true,
        mentionedWeekend: dow === 0 || dow === 6,
      };
    }
  }

  // mañana (sem ser "pasado mañana" já testado, e desambigua de período do dia)
  // Só conta como "amanhã" se vier sem indicação de período (já tratada em extractHora).
  if (/\bmanana\b/.test(text) && !/\b(por la|de la|en la)\s+(tarde|noche|manana)\b/.test(text)) {
    return { ymd: addDays(today.y, today.m, today.d, 1), hadExplicit: true, mentionedWeekend: false };
  }
  // "mañana por la tarde/noche" → +1 dia
  if (/\bmanana\s+(por|de|en)\s+la\s+(tarde|noche|manana)\b/.test(text)) {
    return { ymd: addDays(today.y, today.m, today.d, 1), hadExplicit: true, mentionedWeekend: false };
  }

  return { ymd: null, hadExplicit: false, mentionedWeekend: false };
}

export function parseReunionDateTime(rawInput: string, base: Date = new Date()): ParsedReunion {
  const raw = (rawInput || '').toString();
  const text = normalize(raw);

  // Defaults
  const today = todayInMadrid(base);
  const fallback = nextBusinessDay(today.y, today.m, today.d, false);
  const fallbackFecha = ymdToString(fallback.y, fallback.m, fallback.d);

  if (!text) {
    return { fecha: fallbackFecha, hora: HORA_DEFAULT, confidence: 'low', rawInput: raw };
  }

  const horaResult = extractHora(text);
  const fechaResult = extractFecha(text, base);

  let fechaYMD = fechaResult.ymd;
  let hora = horaResult.hora;

  // Default de data: próximo dia útil
  if (!fechaYMD) {
    fechaYMD = fallback;
  } else if (isWeekend(fechaYMD.y, fechaYMD.m, fechaYMD.d) && !fechaResult.mentionedWeekend) {
    // Se caiu fim de semana sem menção explícita, empurra
    fechaYMD = nextBusinessDay(fechaYMD.y, fechaYMD.m, fechaYMD.d, false);
  }

  // Default de hora
  if (!hora) hora = HORA_DEFAULT;

  // Garante > now() + 2h (em UTC, comparação simples)
  const candidate = new Date(`${ymdToString(fechaYMD.y, fechaYMD.m, fechaYMD.d)}T${hora}+01:00`);
  const minimum = new Date(base.getTime() + 2 * 60 * 60 * 1000);
  if (candidate.getTime() < minimum.getTime()) {
    const pushed = nextBusinessDay(today.y, today.m, today.d, false);
    fechaYMD = pushed;
    hora = HORA_DEFAULT;
  }

  // Confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (fechaResult.hadExplicit && horaResult.hadExplicit) confidence = 'high';
  else if (fechaResult.hadExplicit || horaResult.hadExplicit || horaResult.hadPeriod) confidence = 'medium';

  return {
    fecha: ymdToString(fechaYMD.y, fechaYMD.m, fechaYMD.d),
    hora,
    confidence,
    rawInput: raw,
  };
}
