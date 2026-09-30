// ============================================================================
// SHARED — Convierte números escritos en letras (español) a dígitos.
//
// Se aplica ANTES de los parsers existentes (parseAhorros, parseIngresos,
// parseAhorrosTexto), que siguen aplicando sus propias reglas sin cambios:
//   "Cincomil"          -> "5000"
//   "cinco mil euros"   -> "5000 euros"
//   "Mil euros"         -> "1000 euros"
//   "mil quinientos"    -> "1500"
//   "treinta y cinco"   -> "35"
//   "diez mil"          -> "10000"
// Solo actúa si el texto NO contiene dígitos (si ya hay números, no se toca).
// ============================================================================

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21,
  veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29,
};
const DECENAS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90,
};
const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200,
  trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};

const VALORES: Record<string, number> = { ...UNIDADES, ...DECENAS, ...CENTENAS, mil: 1000 };
// Más largos primero para que "seiscientos" gane a "seis" y "veintiuno" a "veinte".
const PALABRAS = Object.keys(VALORES).sort((a, b) => b.length - a.length);

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Segmenta una palabra entera en tokens numéricos ("cincomil" -> [cinco, mil]). Null si no es 100% numérica. */
function segmentar(palabra: string): string[] | null {
  const tokens: string[] = [];
  let resto = palabra;
  while (resto.length > 0) {
    const t = PALABRAS.find((p) => resto.startsWith(p));
    if (!t) return null;
    tokens.push(t);
    resto = resto.slice(t.length);
  }
  return tokens.length > 0 ? tokens : null;
}

function evaluar(tokens: string[]): number {
  let total = 0;
  let actual = 0;
  for (const t of tokens) {
    if (t === 'mil') {
      total += (actual || 1) * 1000;
      actual = 0;
    } else {
      actual += VALORES[t];
    }
  }
  return total + actual;
}

/** Reemplaza cada secuencia de palabras numéricas por su valor en dígitos. */
export function reemplazarNumerosEnTexto(input?: string | number | null): string {
  if (input === undefined || input === null) return '';
  const original = String(input);
  if (/\d/.test(original)) return original;

  const palabras = normalizar(original).split(/(\s+|[^a-z]+)/).filter((p) => p !== '');
  const salida: string[] = [];
  let run: string[] = [];
  let pendienteY = false; // "y" solo une decena + unidad ("treinta y cinco")

  const cerrarRun = () => {
    if (run.length > 0) salida.push(String(evaluar(run)));
    run = [];
    if (pendienteY) { salida.push(' y'); pendienteY = false; }
  };

  for (const p of palabras) {
    if (/^\s+$/.test(p)) { if (run.length === 0) salida.push(p); continue; }
    if (p === 'y' && run.length > 0 && DECENAS[run[run.length - 1]] !== undefined) {
      pendienteY = true;
      continue;
    }
    const tokens = /^[a-z]+$/.test(p) ? segmentar(p) : null;
    if (tokens) {
      if (pendienteY) {
        const esUnidad = tokens.length >= 1 && UNIDADES[tokens[0]] !== undefined && UNIDADES[tokens[0]] <= 9;
        if (esUnidad) { pendienteY = false; } else { cerrarRun(); salida.push(' '); }
      }
      run.push(...tokens);
    } else {
      const huboRun = run.length > 0;
      cerrarRun();
      if (huboRun) salida.push(' ');
      salida.push(p);
    }
  }
  cerrarRun();
  return salida.join('').replace(/\s+/g, ' ').trim();
}
