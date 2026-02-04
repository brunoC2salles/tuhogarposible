/**
 * Normaliza texto removendo acentos para buscas accent-insensitive.
 * Exemplo: "Málaga" → "Malaga", "Alcalá" → "Alcala"
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

/**
 * Verifica se o texto fonte contém o termo de busca (accent-insensitive).
 * Exemplo: matchesSearch("Málaga", "malaga") → true
 */
export const matchesSearch = (source: string, searchTerm: string): boolean => {
  if (!searchTerm) return true;
  if (!source) return false;
  return normalizeText(source).includes(normalizeText(searchTerm));
};

/**
 * Verifica se algum dos campos do objeto contém o termo de busca.
 * Útil para filtrar objetos por múltiplos campos simultaneamente.
 */
export const matchesAnyField = (
  obj: Record<string, unknown>,
  fields: string[],
  searchTerm: string
): boolean => {
  if (!searchTerm) return true;
  const normalizedSearch = normalizeText(searchTerm);
  
  return fields.some(field => {
    const value = obj[field];
    if (typeof value === 'string') {
      return normalizeText(value).includes(normalizedSearch);
    }
    return false;
  });
};
