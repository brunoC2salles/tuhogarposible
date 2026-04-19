/**
 * Helper para evitar el límite por defecto de 1.000 filas de PostgREST/Supabase.
 * Hace fetch en lotes (`.range(from, to)`) hasta agotar la tabla.
 *
 * Uso:
 *   const rows = await fetchAllPaginated((from, to) =>
 *     supabase.from('leads').select('*, profiles!agente_asignado_id(nombre)', { count: 'exact' })
 *       .order('created_at', { ascending: false })
 *       .range(from, to)
 *   );
 */

interface PaginatedResult<T> {
  data: T[] | null;
  error: any;
  count?: number | null;
}

export async function fetchAllPaginated<T>(
  queryFn: (from: number, to: number) => PromiseLike<PaginatedResult<T>>,
  pageSize = 1000,
  maxPages = 50, // safety cap: 50 × 1000 = 50.000 filas
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  for (let page = 0; page < maxPages; page++) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFn(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break; // última página
    from += pageSize;
  }

  return all;
}
