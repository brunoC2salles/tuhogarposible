/**
 * Corrige errores de digitación comunes en dominios de email.
 * Ejemplos: "gmial.com" → "gmail.com", "hotnail.com" → "hotmail.com".
 *
 * Estrategia:
 * 1. Lista de dominios populares conocidos.
 * 2. Si el dominio escrito no es uno de ellos, busca el más cercano (distancia Levenshtein ≤ 2).
 * 3. Si encuentra match cercano, devuelve el email corregido + flag corrected=true.
 *
 * También corrige TLDs incompletos (".con" → ".com", ".cm" → ".com").
 */

const KNOWN_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'live.com',
  'live.es',
  'me.com',
  'msn.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'gmx.es',
  'mail.com',
  'telefonica.net',
  'movistar.es',
  'orange.es',
  'terra.es',
  'ya.com',
];

const TLD_FIXES: Record<string, string> = {
  'con': 'com',
  'cmo': 'com',
  'co': 'com',
  'cm': 'com',
  'om': 'com',
  'cpm': 'com',
  'comm': 'com',
  'comn': 'com',
  'es.com': 'es',
};

/**
 * Distancia de Levenshtein entre dos strings.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1,     // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export interface EmailCorrectionResult {
  email: string;          // email final (corregido o original)
  corrected: boolean;     // true si se aplicó alguna corrección
  original?: string;      // email original cuando hubo corrección
  reason?: string;        // motivo de la corrección
}

/**
 * Intenta corregir un email con typos en el dominio.
 * Devuelve el email original si no se detectó ningún typo claro.
 */
export function correctEmail(rawEmail: string): EmailCorrectionResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { email: rawEmail, corrected: false };
  }

  const original = rawEmail.trim();
  const email = original.toLowerCase();

  const atIndex = email.lastIndexOf('@');
  if (atIndex < 1 || atIndex === email.length - 1) {
    return { email: original, corrected: false };
  }

  const localPart = email.slice(0, atIndex);
  let domain = email.slice(atIndex + 1);

  // 1. Si ya es un dominio conocido, no tocar
  if (KNOWN_DOMAINS.includes(domain)) {
    return { email: `${localPart}@${domain}`, corrected: original !== `${localPart}@${domain}` };
  }

  // 2. Corregir TLD obvios (".con" → ".com", etc.)
  const dotIndex = domain.lastIndexOf('.');
  if (dotIndex > 0) {
    const base = domain.slice(0, dotIndex);
    const tld = domain.slice(dotIndex + 1);
    if (TLD_FIXES[tld]) {
      domain = `${base}.${TLD_FIXES[tld]}`;
    }
  }

  // 3. Si tras arreglar el TLD ya coincide con un dominio conocido, listo
  if (KNOWN_DOMAINS.includes(domain)) {
    const fixed = `${localPart}@${domain}`;
    return {
      email: fixed,
      corrected: fixed !== original.toLowerCase(),
      original: fixed !== original.toLowerCase() ? original : undefined,
      reason: fixed !== original.toLowerCase() ? `Dominio corregido a ${domain}` : undefined,
    };
  }

  // 4. Buscar dominio más cercano por distancia Levenshtein
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const known of KNOWN_DOMAINS) {
    const dist = levenshtein(domain, known);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = known;
    }
  }

  // Umbral: aceptar correcciones de hasta 2 caracteres (típicas typo de dedo)
  // Para dominios muy cortos (< 6 chars), exigir distancia ≤ 1 para evitar falsos positivos.
  const maxAllowed = (bestMatch && bestMatch.length < 8) ? 1 : 2;

  if (bestMatch && bestDistance > 0 && bestDistance <= maxAllowed) {
    const fixed = `${localPart}@${bestMatch}`;
    return {
      email: fixed,
      corrected: true,
      original,
      reason: `Posible typo: "${domain}" → "${bestMatch}" (distancia ${bestDistance})`,
    };
  }

  // Sin corrección clara
  return { email: `${localPart}@${domain}`, corrected: original.toLowerCase() !== `${localPart}@${domain}` };
}
