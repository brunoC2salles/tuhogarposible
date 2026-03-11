import { normalizeText } from './textUtils';
import type { MarketPrice } from '@/data/marketPrices';

export interface MarketComparison {
  /** Percentage difference: positive = above market, negative = below */
  diferenciaPorcentaje: number;
  precioM2Mercado: number;
  precioM2Inmueble: number;
  precioMedioMercado: number;
  municipio: string;
  /** true if within ±30% of market average */
  estaEnRango: boolean;
  totalInformados: number;
}

/**
 * Look up market price for a municipality name (accent-insensitive)
 */
export function getMarketPrice(
  map: Record<string, MarketPrice>,
  municipio: string
): MarketPrice | null {
  if (!municipio || !map) return null;
  
  const key = normalizeText(municipio);
  
  // Direct lookup
  if (map[key]) return map[key];
  
  // Partial match: try to find a key that contains/is contained by the search
  for (const [k, v] of Object.entries(map)) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  
  return null;
}

/**
 * Compare a property's price to the market average for its municipality
 */
export function comparePriceToMarket(
  map: Record<string, MarketPrice>,
  precio: number,
  areaM2: number | null | undefined,
  municipio: string
): MarketComparison | null {
  const market = getMarketPrice(map, municipio);
  if (!market) return null;
  
  // If we have area, compare price/m²; otherwise compare total price
  if (areaM2 && areaM2 > 0) {
    const precioM2Inmueble = precio / areaM2;
    const diff = ((precioM2Inmueble - market.precioM2) / market.precioM2) * 100;
    
    return {
      diferenciaPorcentaje: Math.round(diff),
      precioM2Mercado: market.precioM2,
      precioM2Inmueble: Math.round(precioM2Inmueble),
      precioMedioMercado: market.precioMedio,
      municipio: market.municipio,
      estaEnRango: Math.abs(diff) <= 30,
      totalInformados: market.totalInformados,
    };
  }
  
  // Compare total price to average price
  const diff = ((precio - market.precioMedio) / market.precioMedio) * 100;
  
  return {
    diferenciaPorcentaje: Math.round(diff),
    precioM2Mercado: market.precioM2,
    precioM2Inmueble: 0,
    precioMedioMercado: market.precioMedio,
    municipio: market.municipio,
    estaEnRango: Math.abs(diff) <= 50,
    totalInformados: market.totalInformados,
  };
}

/**
 * Format a human-readable market comparison string
 */
export function formatMarketComparison(comparison: MarketComparison): string {
  const abs = Math.abs(comparison.diferenciaPorcentaje);
  
  if (abs <= 5) {
    return `En línea con la media del mercado en ${comparison.municipio}`;
  }
  
  const direction = comparison.diferenciaPorcentaje > 0 ? 'por encima' : 'por debajo';
  return `${abs}% ${direction} de la media en ${comparison.municipio}`;
}

/**
 * Get badge color based on market comparison
 * Below market = green (good deal), above = orange/red
 */
export function getMarketBadgeColor(diferenciaPorcentaje: number): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} {
  if (diferenciaPorcentaje <= -15) {
    return { variant: 'default', className: 'bg-green-600 hover:bg-green-700 text-white' };
  }
  if (diferenciaPorcentaje <= -5) {
    return { variant: 'default', className: 'bg-green-500 hover:bg-green-600 text-white' };
  }
  if (diferenciaPorcentaje <= 5) {
    return { variant: 'secondary', className: '' };
  }
  if (diferenciaPorcentaje <= 20) {
    return { variant: 'outline', className: 'border-amber-500 text-amber-600' };
  }
  return { variant: 'destructive', className: '' };
}

/**
 * Validate if a budget is realistic for a municipality
 * Used by webhook qualification
 */
export function validateBudgetForCity(
  map: Record<string, MarketPrice>,
  valorDeseado: number,
  municipio: string
): { realista: boolean; mensaje: string; precioMedio?: number } {
  const market = getMarketPrice(map, municipio);
  if (!market) {
    return { realista: true, mensaje: 'Sin datos de mercado disponibles' };
  }
  
  const ratio = valorDeseado / market.precioMedio;
  
  if (ratio > 3) {
    return {
      realista: false,
      mensaje: `⚠️ Presupuesto (${valorDeseado.toLocaleString('es-ES')}€) muy alto para ${market.municipio} (media: ${market.precioMedio.toLocaleString('es-ES')}€)`,
      precioMedio: market.precioMedio,
    };
  }
  
  if (ratio < 0.2) {
    return {
      realista: false,
      mensaje: `⚠️ Presupuesto (${valorDeseado.toLocaleString('es-ES')}€) muy bajo para ${market.municipio} (media: ${market.precioMedio.toLocaleString('es-ES')}€)`,
      precioMedio: market.precioMedio,
    };
  }
  
  return {
    realista: true,
    mensaje: `Presupuesto realista para ${market.municipio} (media: ${market.precioMedio.toLocaleString('es-ES')}€)`,
    precioMedio: market.precioMedio,
  };
}
