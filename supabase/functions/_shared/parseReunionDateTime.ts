// ============================================================================
// parseReunionDateTime — parser do horário livre do lead (formulário Meta Ads).
//
// Política:
//  - A DATA é extraída primeiro e o trecho correspondente é REMOVIDO do texto
//    antes de procurar a hora (evita que "3/8" vire "03:00").
//  - Sem hora confiável → `hora = null` (reunião "a definir"); nenhum
//    recordatório é agendado.
//  - Hora sempre normalizada para a franja laboral 08:00–20:00 (Madrid).
//  - Datas absurdas (> 90 dias) são descartadas e caem no fallback.
//  - Fim de semana empurrado para o próximo dia útil.
//
// Saídas:
//   fecha:      YYYY-MM-DD | null
//   hora:       HH:mm:ss   | null
//   confidence: 'high' | 'medium' | 'pending_time' | 'pending'
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

const MONTH_MAP: Record<string, number> = {
  enero: 1, ene: 1, janeiro: 1,
  febrero: 2, feb: 2, fevereiro: 2,
  marzo: 3, mar: 3, marco: 3,
  abril: 4, abr: 4,
  mayo: 5, may: 5, maio: 5,
  junio: 6, jun: 6, junho: 6,
  julio: 7, jul: 7, julho: 7,
  agosto: 8, ago: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9, setembro: 9,
  octubre: 10, oct: 10, outubro: 10,
  noviembre: 11, nov: 11, novembro: 11,
  diciembre: 12, dic: 12, dezembro: 12,
};

const WORK_START = 8;
const WORK_END = 20;
const MAX_HORIZON_DAYS = 180;

/** Texto que indica que a hora dita pelo lead é hora canária (Madrid = +1h). */
const CANARIAS_RE =
  /\b(canarias|canaria|tenerife|las palmas|gran canaria|lanzarote|fuerteventura|la gomera|el hierro)\b/;


function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // "11'30" / "11´30" / "11`30" → "11:30"
    .replace(/(\d)\s*['´`]\s*(\d{2})\b/g, '$1:$2')
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

function daysBetween(a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }): number {
  const da = Date.UTC(a.y, a.m - 1, a.d);
  const db = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((db - da) / 86400000);
}

function isValidDay(d: number, m: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= maxDay;
}

// ---------------------------------------------------------------------------
// DATA
// ---------------------------------------------------------------------------

interface FechaExtract {
  ymd: { y: number; m: number; d: number } | null;
  hadExplicit: boolean;
  /** texto restante, já sem o trecho consumido pela data */
  rest: string;
}

function resolveYear(dd: number, mm: number, yyRaw: string | undefined, today: { y: number; m: number; d: number }) {
  let yy = yyRaw ? parseInt(yyRaw, 10) : today.y;
  // Ano de 2 dígitos só é aceite se for plausível (>= 24). Assim "07/08-12/00"
  // não interpreta "12" como ano 2012 — é hora, não ano.
  if (yyRaw && yy < 100) {
    if (yy < 24) {
      yy = today.y;
      yyRaw = undefined;
    } else {
      yy += 2000;
    }
  }
  if (!yyRaw) {
    const cand = Date.UTC(yy, mm - 1, dd);
    const todayDt = Date.UTC(today.y, today.m - 1, today.d);
    if (cand < todayDt) yy += 1;
  }
  return yy;
}

function extractFecha(text: string, base: Date): FechaExtract {
  const today = todayInMadrid(base);
  const strip = (m: RegExpMatchArray) =>
    (text.slice(0, m.index!) + ' ' + text.slice(m.index! + m[0].length)).replace(/\s+/g, ' ').trim();

  // 1) dd/mm[/aaaa] — também aceita espaços em volta dos separadores
  // Ano: só 4 dígitos ou 2 dígitos plausíveis (>=20). Evita ler a hora
  // ("07/08-12/00") como se "12" fosse o ano.
  const dmy = text.match(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{4}|[2-9]\d)\b)?/);
  if (dmy) {
    const dd = parseInt(dmy[1], 10);
    const mm = parseInt(dmy[2], 10);
    if (isValidDay(dd, mm)) {
      const yy = resolveYear(dd, mm, dmy[3], today);
      return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, rest: strip(dmy) };
    }
  }

  // 1b) Data compacta sem separadores: ddmmaaaa / ddmmaa / ddmm ("19082026")
  const compact = text.match(/\b(\d{2})(\d{2})(\d{4}|\d{2})?\b/);
  if (compact) {
    const dd = parseInt(compact[1], 10);
    const mm = parseInt(compact[2], 10);
    if (isValidDay(dd, mm) && mm >= 1 && mm <= 12) {
      const yy = resolveYear(dd, mm, compact[3], today);
      return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, rest: strip(compact) };
    }
  }



  // 2) "8 de agosto" / "8 agosto" / "agosto 8"
  const dMonth = text.match(
    /\b(\d{1,2})\s*(?:de\s+|del\s+)?(enero|ene|febrero|feb|marzo|marco|abril|abr|mayo|may|maio|junio|jun|junho|julio|jul|julho|agosto|ago|septiembre|setiembre|setembro|sept|sep|octubre|oct|outubro|noviembre|nov|novembro|diciembre|dic|dezembro)\b(?:\s*(?:de\s+|del\s+)?(\d{4}))?/,
  );
  if (dMonth) {
    const dd = parseInt(dMonth[1], 10);
    const mm = MONTH_MAP[dMonth[2]];
    if (mm && isValidDay(dd, mm)) {
      const yy = resolveYear(dd, mm, dMonth[3], today);
      return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, rest: strip(dMonth) };
    }
  }

  // 2b) "10 de 09" (mês numérico escrito por extenso com "de")
  const dNumMonth = text.match(/\b(\d{1,2})\s+de\s+(\d{1,2})\b(?:\s+de\s+(\d{4}))?/);
  if (dNumMonth) {
    const dd = parseInt(dNumMonth[1], 10);
    const mm = parseInt(dNumMonth[2], 10);
    if (isValidDay(dd, mm) && mm <= 12) {
      const yy = resolveYear(dd, mm, dNumMonth[3], today);
      return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, rest: strip(dNumMonth) };
    }
  }

  if (/\bpasado\s+manana\b/.test(text)) {
    const m = text.match(/\bpasado\s+manana\b/)!;
    return { ymd: addDays(today.y, today.m, today.d, 2), hadExplicit: true, rest: strip(m) };
  }

  const hoy = text.match(/\b(hoy|today|hoje)\b/);
  if (hoy) {
    return { ymd: { y: today.y, m: today.m, d: today.d }, hadExplicit: true, rest: strip(hoy) };
  }

  // 3) "3 8" (dia mês separados por espaço), ex.: "lunes 3 8 hra 5 pm" ou "03 08 11"
  const pair = text.match(/\b(\d{1,2})\s+(\d{1,2})\b(?!\s*[:.])/);
  if (pair) {
    const dd = parseInt(pair[1], 10);
    const mm = parseInt(pair[2], 10);
    if (isValidDay(dd, mm) && mm <= 12 && dd >= 1) {
      const yy = resolveYear(dd, mm, undefined, today);
      return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, rest: strip(pair) };
    }
  }

  // 4) dia da semana
  for (const [word, dow] of Object.entries(DOW_MAP)) {
    const m = text.match(new RegExp(`\\b${word}\\b`));
    if (m) {
      return { ymd: nextWeekday(today.y, today.m, today.d, dow), hadExplicit: true, rest: strip(m) };
    }
  }

  // 5) "mañana" como dia seguinte (só quando não é franja horária)
  if (/\bmanana\b/.test(text)) {
    const isFranja = /\b(por|de|en)\s+la\s+manana\b/.test(text);
    if (!isFranja) {
      const m = text.match(/\bmanana\b/)!;
      return { ymd: addDays(today.y, today.m, today.d, 1), hadExplicit: true, rest: strip(m) };
    }
  }

  // 6) Só o dia do mês: "24", "dia 24". Aceita-se apenas quando é inequívoco
  // (dito com "dia", ou número 13–31 que não pode ser uma hora).
  const diaWord = text.match(/\bdia\s+(\d{1,2})\b/);
  const soloNum = text.match(/^(\d{1,2})$/);
  const diaMatch = diaWord ?? (soloNum && parseInt(soloNum[1], 10) >= 13 ? soloNum : null);
  if (diaMatch) {
    const dd = parseInt(diaMatch[1], 10);
    if (dd >= 1 && dd <= 31) {
      let mm = today.m;
      let yy = today.y;
      if (dd < today.d) {
        mm += 1;
        if (mm > 12) { mm = 1; yy += 1; }
      }
      if (isValidDay(dd, mm)) {
        return { ymd: { y: yy, m: mm, d: dd }, hadExplicit: true, rest: strip(diaMatch) };
      }
    }
  }

  return { ymd: null, hadExplicit: false, rest: text };

}

// ---------------------------------------------------------------------------
// HORA
// ---------------------------------------------------------------------------

interface HoraExtract {
  hora: string | null;
  hadExplicit: boolean;
}

function extractHora(text: string): HoraExtract {
  const hadTarde = /\b(tarde|afternoon|pm|p\.?\s?m\.?)\b/.test(text);
  const hadNoche = /\b(noche|noite|evening|night)\b/.test(text);
  const hadAm = /\b(am|a\.?\s?m\.?|manana|manha|morning)\b/.test(text);

  let h: number | null = null;
  let mm = 0;

  const ampm = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)\b/);
  const colon = text.match(/\b(\d{1,2}):(\d{2})\b/);
  const hFmt = text.match(/\b(\d{1,2})\s*h(?:s|rs?|oras?)?\b(?:\s*(\d{2}))?/);
  const dot = text.match(/\b(\d{1,2})[.,](\d{2})\b/);
  // "12/00" ou "12-30" usados como hora (depois de a data já ter sido retirada)
  const slash = text.match(/\b(\d{1,2})\s*[\/\-]\s*([0-5]\d)\b/);
  const lasN = text.match(/\blas\s+(\d{1,2})\b/);
  const onlyH = text.match(/\b(\d{1,2})\b/);

  if (ampm) {
    h = parseInt(ampm[1], 10);
    mm = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const isPm = /p/.test(ampm[3]);
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
  } else if (colon) {
    h = parseInt(colon[1], 10);
    mm = parseInt(colon[2], 10);
  } else if (hFmt) {
    h = parseInt(hFmt[1], 10);
    mm = hFmt[2] ? parseInt(hFmt[2], 10) : 0;
  } else if (dot) {
    h = parseInt(dot[1], 10);
    mm = parseInt(dot[2], 10);
  } else if (slash && parseInt(slash[1], 10) <= 23) {
    h = parseInt(slash[1], 10);
    mm = parseInt(slash[2], 10);
  } else if (lasN) {
    h = parseInt(lasN[1], 10);
  } else if (onlyH) {
    const candidate = parseInt(onlyH[1], 10);
    if (candidate >= 0 && candidate <= 23) h = candidate;
  }

  if (h === null) return { hora: null, hadExplicit: false };
  if (mm < 0 || mm > 59) mm = 0;

  // Desambiguação por franja: "4 de la tarde" → 16, "8 de la noche" → 20
  if ((hadTarde || hadNoche) && h < 12) h += 12;

  // Fora da franja laboral: tenta interpretar como tarde ("las 6" → 18:00)
  if (h < WORK_START && !hadAm && h + 12 <= WORK_END) h += 12;

  if (h < WORK_START || h > WORK_END || h > 23) {
    return { hora: null, hadExplicit: false };
  }
  if (h === WORK_END) mm = 0;

  return { hora: `${pad(h)}:${pad(mm)}:00`, hadExplicit: true };
}

// ---------------------------------------------------------------------------

export function parseReunionDateTime(rawInput: string, base: Date = new Date()): ParsedReunion {
  const raw = (rawInput || '').toString();
  const text = normalize(raw);

  if (!text) {
    return { fecha: null, hora: null, confidence: 'pending', rawInput: raw };
  }

  const fechaResult = extractFecha(text, base);
  const horaResult = extractHora(fechaResult.rest);

  const today = todayInMadrid(base);
  let fechaYMD = fechaResult.ymd;
  const hora = horaResult.hora;

  // Descarta datas absurdas (fora do horizonte) ou já passadas
  if (fechaYMD) {
    const delta = daysBetween(today, fechaYMD);
    if (delta < 0 || delta > MAX_HORIZON_DAYS) fechaYMD = null;
  }

  // Fim de semana → próximo dia útil, preservando a hora
  if (fechaYMD && isWeekend(fechaYMD.y, fechaYMD.m, fechaYMD.d)) {
    fechaYMD = nextBusinessDay(fechaYMD.y, fechaYMD.m, fechaYMD.d, false);
  }

  // Sem data nem hora → próximo dia útil às 11:00
  if (!fechaYMD && !hora) {
    const fallback = nextBusinessDay(today.y, today.m, today.d, false);
    return {
      fecha: ymdToString(fallback.y, fallback.m, fallback.d),
      hora: '11:00:00',
      confidence: 'medium',
      rawInput: raw,
    };
  }

  // Data sem hora → hora a definir
  if (fechaYMD && !hora) {
    return {
      fecha: ymdToString(fechaYMD.y, fechaYMD.m, fechaYMD.d),
      hora: null,
      confidence: 'pending_time',
      rawInput: raw,
    };
  }

  // Hora sem data → próximo dia útil (incluindo hoje)
  if (!fechaYMD && hora) {
    fechaYMD = nextBusinessDay(today.y, today.m, today.d, true);
  }

  // Buffer mínimo de 2h
  const candidate = new Date(`${ymdToString(fechaYMD!.y, fechaYMD!.m, fechaYMD!.d)}T${hora}+02:00`);
  const minimum = new Date(base.getTime() + 2 * 60 * 60 * 1000);
  if (candidate.getTime() < minimum.getTime()) {
    fechaYMD = nextBusinessDay(fechaYMD!.y, fechaYMD!.m, fechaYMD!.d, false);
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
