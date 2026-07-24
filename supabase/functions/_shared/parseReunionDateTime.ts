// ============================================================================
// parseReunionDateTime — parser do horário livre do lead (formulário Meta Ads).
//
// Política (junho/2026): NÃO inventar hora quando o lead só dá franja
// (mañana/tarde/noche), só dia da semana (lunes) ou expressão vaga
// (cualquier día). Nestes casos retornamos `hora = null` e a reunião fica
// como "a definir" — o agente confirma manualmente no CRM. Sem hora, nenhum
// recordatório é agendado (o trigger só dispara quando reunion_datetime
// está completo).
//
// Saídas:
//   fecha:      YYYY-MM-DD | null
//   hora:       HH:mm:ss   | null
//   confidence:
//     'high'         = dia e hora explícitos
//     'medium'       = ambos extraídos, com alguma inferência
//     'pending_time' = data ok, hora a definir
//     'pending'      = nada extraído (vagueza total)
// ============================================================================

export type ReunionConfidence = 'high' | 'medium' | 'pending_time' | 'pending';

export interface ParsedReunion {
  fecha: string | null;
  hora: string | null;
  confidence: ReunionConfidence;
  rawInput: string;
}

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
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(d);
}

function todayInMadrid(base: Date): { y: number; m: number; d: number } {
  const [y, m, d] = toLocalYMD(base).split('-').map(Number);
  return { y, m, d };
}

function addDays(y: number, m: number, d: number, days: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function nextWeekday(y: number, m: number, d: number, targetDow: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const curDow = dt.getUTCDay();
  let diff = (targetDow - curDow + 7) % 7;
  if (diff === 0) diff = 7;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function isWeekend(y: number, m: number, d: number): boolean {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

function nextBusinessDay(y: number, m: number, d: number, includeToday: boolean) {
  let cur = includeToday ? { y, m, d } : addDays(y, m, d, 1);
  for (let i = 0; i < 7; i++) {
    if (!isWeekend(cur.y, cur.m, cur.d)) return cur;
    cur = addDays(cur.y, cur.m, cur.d, 1);
  }
  return cur;
}

function ymdToString(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

interface HoraExtract {
  hora: string | null;
  hadPeriod: boolean;
  hadExplicit: boolean;
}

function extractHora(text: string): HoraExtract {
  const hadMañana = /\b(manana|manha|mañana|morning)\b/.test(text);
  const hadTarde = /\b(tarde|afternoon)\b/.test(text);
  const hadNoche = /\b(noche|noite|evening|night)\b/.test(text);
  const hadPeriod = hadMañana || hadTarde || hadNoche;

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
    const candidate = parseInt(onlyH[1], 10);
    if (candidate >= 0 && candidate <= 23) h = candidate;
  }

  if (h === null) {
    // Política nova: franja (mañana/tarde/noche) SEM número NÃO vira hora.
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

  const dmy = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (dmy) {
    const dd = parseInt(dmy[1], 10);
    const mm = parseInt(dmy[2], 10);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      let yy = dmy[3] ? parseInt(dmy[3], 10) : today.y;
      if (yy < 100) yy += 2000;
      if (!dmy[3]) {
        const cand = new Date(Date.UTC(yy, mm - 1, dd));
        const todayDt = new Date(Date.UTC(today.y, today.m - 1, today.d));
        if (cand < todayDt) yy += 1;
      }
      return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, mentionedWeekend: false };
    }
  }

  if (/\bpasado\s+manana\b/.test(text) || /\baftertomorrow\b/.test(text)) {
    return { ymd: addDays(today.y, today.m, today.d, 2), hadExplicit: true, mentionedWeekend: false };
  }

  if (/\b(hoy|today|hoje)\b/.test(text)) {
    return { ymd: { y: today.y, m: today.m, d: today.d }, hadExplicit: true, mentionedWeekend: false };
  }

  for (const [word, dow] of Object.entries(DOW_MAP)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      return {
        ymd: nextWeekday(today.y, today.m, today.d, dow),
        hadExplicit: true,
        mentionedWeekend: dow === 0 || dow === 6,
      };
    }
  }

  if (/\bmanana\b/.test(text) && !/\b(por la|de la|en la)\s+(tarde|noche|manana)\b/.test(text)) {
    return { ymd: addDays(today.y, today.m, today.d, 1), hadExplicit: true, mentionedWeekend: false };
  }
  if (/\bmanana\s+(por|de|en)\s+la\s+(tarde|noche|manana)\b/.test(text)) {
    return { ymd: addDays(today.y, today.m, today.d, 1), hadExplicit: true, mentionedWeekend: false };
  }

  return { ymd: null, hadExplicit: false, mentionedWeekend: false };
}

export function parseReunionDateTime(rawInput: string, base: Date = new Date()): ParsedReunion {
  const raw = (rawInput || '').toString();
  const text = normalize(raw);

  if (!text) {
    return { fecha: null, hora: null, confidence: 'pending', rawInput: raw };
  }

  const horaResult = extractHora(text);
  const fechaResult = extractFecha(text, base);

  let fechaYMD = fechaResult.ymd;
  let hora = horaResult.hora;

  // Fim de semana (sábado/domingo) SEMPRE é empurrado para o próximo dia útil,
  // mesmo quando o lead menciona explicitamente. Preservamos o horário.
  if (fechaYMD && isWeekend(fechaYMD.y, fechaYMD.m, fechaYMD.d)) {
    fechaYMD = nextBusinessDay(fechaYMD.y, fechaYMD.m, fechaYMD.d, false);
  }

  // Sem data nem hora → totalmente a definir
  if (!fechaYMD && !hora) {
    return { fecha: null, hora: null, confidence: 'pending', rawInput: raw };
  }

  // Tem data mas não tem hora → pending_time (a definir hora)
  if (fechaYMD && !hora) {
    return {
      fecha: ymdToString(fechaYMD.y, fechaYMD.m, fechaYMD.d),
      hora: null,
      confidence: 'pending_time',
      rawInput: raw,
    };
  }

  // Tem hora mas não tem data → assume próximo dia útil para a hora
  if (!fechaYMD && hora) {
    const today = todayInMadrid(base);
    fechaYMD = nextBusinessDay(today.y, today.m, today.d, true);
  }

  // Aqui temos ambos. Garante buffer de 2h.
  const candidate = new Date(`${ymdToString(fechaYMD!.y, fechaYMD!.m, fechaYMD!.d)}T${hora}+01:00`);
  const minimum = new Date(base.getTime() + 2 * 60 * 60 * 1000);
  if (candidate.getTime() < minimum.getTime()) {
    const today = todayInMadrid(base);
    fechaYMD = nextBusinessDay(today.y, today.m, today.d, false);
  }

  const confidence: ReunionConfidence =
    fechaResult.hadExplicit && horaResult.hadExplicit ? 'high' : 'medium';

  return {
    fecha: ymdToString(fechaYMD!.y, fechaYMD!.m, fechaYMD!.d),
    hora,
    confidence,
    rawInput: raw,
  };
}
