/**
 * Market prices module - lazy-loads and processes datos_raw.json
 * Only loaded when needed via dynamic import pattern
 */

export interface MarketPrice {
  municipio: string;
  provincia: string;
  ccaa: string;
  precioM2: number;
  precioMedio: number;
  superficieMedia: number;
  totalInformados: number;
}

interface RawEntry {
  attributes: {
    name_muni: string;
    name_prov: string;
    name_ccaa: string;
    precio_m2: number;
    precio_medio: number;
    superficie_media: number;
    total_informados: number;
    tipo_construccion_id: number;
    clase_finca_urbana_id: number;
  };
}

// Normalize text for lookup keys (remove accents, lowercase)
function normalizeKey(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

let _cache: Record<string, MarketPrice> | null = null;
let _loading: Promise<Record<string, MarketPrice>> | null = null;

/**
 * Returns the market prices lookup map.
 * Lazy-loads and filters datos_raw.json on first call.
 * Filters: tipo_construccion_id=99, clase_finca_urbana_id=99 (aggregated averages)
 */
export async function getMarketPricesMap(): Promise<Record<string, MarketPrice>> {
  if (_cache) return _cache;
  
  if (_loading) return _loading;
  
  _loading = (async () => {
    try {
      const rawModule = await import('./datos_raw.json');
      const rawData: RawEntry[] = rawModule.default || rawModule;
      
      const map: Record<string, MarketPrice> = {};
      
      for (const entry of rawData) {
        const attr = entry.attributes;
        
        // Filter: only aggregated averages (tipo=99, clase=99)
        if (attr.tipo_construccion_id !== 99 || attr.clase_finca_urbana_id !== 99) continue;
        
        // Skip entries without price data
        if (!attr.precio_m2 || attr.precio_m2 <= 0) continue;
        
        const key = normalizeKey(attr.name_muni);
        
        // If duplicate municipality, keep the one with more data points
        if (map[key] && map[key].totalInformados >= attr.total_informados) continue;
        
        map[key] = {
          municipio: attr.name_muni,
          provincia: attr.name_prov,
          ccaa: attr.name_ccaa,
          precioM2: attr.precio_m2,
          precioMedio: attr.precio_medio,
          superficieMedia: attr.superficie_media,
          totalInformados: attr.total_informados,
        };
      }
      
      console.log(`[MarketPrices] Loaded ${Object.keys(map).length} municipalities`);
      _cache = map;
      return map;
    } catch (err) {
      console.error('[MarketPrices] Failed to load data:', err);
      _cache = {};
      return {};
    }
  })();
  
  return _loading;
}

/**
 * Synchronous access to cache (returns null if not loaded yet)
 */
export function getMarketPricesCached(): Record<string, MarketPrice> | null {
  return _cache;
}
