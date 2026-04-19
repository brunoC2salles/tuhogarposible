/**
 * Corrige errores de digitación comunes en dominios de email (versión Deno).
 * Mantenida en sync con `src/lib/emailCorrection.ts`.
 */

const KNOWN_DOMAINS = [
  'gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es',
  'yahoo.com', 'yahoo.es', 'icloud.com', 'live.com', 'live.es',
  'me.com', 'msn.com', 'aol.com', 'protonmail.com', 'proton.me',
  'gmx.com', 'gmx.es', 'mail.com', 'telefonica.net', 'movistar.es',
  'orange.es', 'terra.es', 'ya.com',
];

const TLD_FIXES: Record<string, string> = {
  'con': 'com', 'cmo': 'com', 'co': 'com', 'cm': 'com', 'om': 'com',
  'cpm': 'com', 'comm': 'com', 'comn': 'com',
};

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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export interface EmailCorrectionResult {
  email: string;
  corrected: boolean;
  original?: string;
  reason?: string;
}

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

  if (KNOWN_DOMAINS.includes(domain)) {
    const fixed = `${localPart}@${domain}`;
    return { email: fixed, corrected: original !== fixed, original: original !== fixed ? original : undefined };
  }

  const dotIndex = domain.lastIndexOf('.');
  if (dotIndex > 0) {
    const base = domain.slice(0, dotIndex);
    const tld = domain.slice(dotIndex + 1);
    if (TLD_FIXES[tld]) {
      domain = `${base}.${TLD_FIXES[tld]}`;
    }
  }

  if (KNOWN_DOMAINS.includes(domain)) {
    const fixed = `${localPart}@${domain}`;
    return {
      email: fixed,
      corrected: fixed !== original.toLowerCase(),
      original: fixed !== original.toLowerCase() ? original : undefined,
      reason: `Dominio corregido a ${domain}`,
    };
  }

  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  for (const known of KNOWN_DOMAINS) {
    const dist = levenshtein(domain, known);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = known;
    }
  }

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

  return { email: `${localPart}@${domain}`, corrected: original.toLowerCase() !== `${localPart}@${domain}` };
}
