/**
 * Province-level market price averages for edge functions.
 * Manually compiled from datos.json aggregated data (tipo=99, clase=99).
 * Used for quick budget validation in webhooks without loading full municipality data.
 */

export interface ProvinceMarketPrice {
  provincia: string;
  ccaa: string;
  precioM2: number;
  precioMedio: number;
}

// Province-level averages (representative values from the dataset)
export const PROVINCE_MARKET_PRICES: Record<string, ProvinceMarketPrice> = {
  // Andalucía
  'almeria': { provincia: 'Almería', ccaa: 'Andalucía', precioM2: 1050, precioMedio: 95000 },
  'cadiz': { provincia: 'Cádiz', ccaa: 'Andalucía', precioM2: 1350, precioMedio: 130000 },
  'cordoba': { provincia: 'Córdoba', ccaa: 'Andalucía', precioM2: 850, precioMedio: 90000 },
  'granada': { provincia: 'Granada', ccaa: 'Andalucía', precioM2: 1100, precioMedio: 110000 },
  'huelva': { provincia: 'Huelva', ccaa: 'Andalucía', precioM2: 800, precioMedio: 80000 },
  'jaen': { provincia: 'Jaén', ccaa: 'Andalucía', precioM2: 600, precioMedio: 60000 },
  'malaga': { provincia: 'Málaga', ccaa: 'Andalucía', precioM2: 2100, precioMedio: 220000 },
  'sevilla': { provincia: 'Sevilla', ccaa: 'Andalucía', precioM2: 1400, precioMedio: 140000 },
  // Aragón
  'huesca': { provincia: 'Huesca', ccaa: 'Aragón', precioM2: 900, precioMedio: 100000 },
  'teruel': { provincia: 'Teruel', ccaa: 'Aragón', precioM2: 550, precioMedio: 60000 },
  'zaragoza': { provincia: 'Zaragoza', ccaa: 'Aragón', precioM2: 1200, precioMedio: 120000 },
  // Asturias
  'asturias': { provincia: 'Asturias', ccaa: 'Principado de Asturias', precioM2: 1100, precioMedio: 100000 },
  // Baleares
  'baleares': { provincia: 'Islas Baleares', ccaa: 'Islas Baleares', precioM2: 3200, precioMedio: 350000 },
  'palma': { provincia: 'Islas Baleares', ccaa: 'Islas Baleares', precioM2: 3200, precioMedio: 350000 },
  'mallorca': { provincia: 'Islas Baleares', ccaa: 'Islas Baleares', precioM2: 3200, precioMedio: 350000 },
  // Canarias
  'las palmas': { provincia: 'Las Palmas', ccaa: 'Canarias', precioM2: 1800, precioMedio: 180000 },
  'santa cruz de tenerife': { provincia: 'Santa Cruz de Tenerife', ccaa: 'Canarias', precioM2: 1600, precioMedio: 160000 },
  'tenerife': { provincia: 'Santa Cruz de Tenerife', ccaa: 'Canarias', precioM2: 1600, precioMedio: 160000 },
  // Cantabria
  'cantabria': { provincia: 'Cantabria', ccaa: 'Cantabria', precioM2: 1300, precioMedio: 130000 },
  'santander': { provincia: 'Cantabria', ccaa: 'Cantabria', precioM2: 1300, precioMedio: 130000 },
  // Castilla-La Mancha
  'albacete': { provincia: 'Albacete', ccaa: 'Castilla-La Mancha', precioM2: 750, precioMedio: 80000 },
  'ciudad real': { provincia: 'Ciudad Real', ccaa: 'Castilla-La Mancha', precioM2: 600, precioMedio: 65000 },
  'cuenca': { provincia: 'Cuenca', ccaa: 'Castilla-La Mancha', precioM2: 550, precioMedio: 60000 },
  'guadalajara': { provincia: 'Guadalajara', ccaa: 'Castilla-La Mancha', precioM2: 1000, precioMedio: 110000 },
  'toledo': { provincia: 'Toledo', ccaa: 'Castilla-La Mancha', precioM2: 750, precioMedio: 85000 },
  // Castilla y León
  'avila': { provincia: 'Ávila', ccaa: 'Castilla y León', precioM2: 700, precioMedio: 75000 },
  'burgos': { provincia: 'Burgos', ccaa: 'Castilla y León', precioM2: 1000, precioMedio: 110000 },
  'leon': { provincia: 'León', ccaa: 'Castilla y León', precioM2: 750, precioMedio: 80000 },
  'palencia': { provincia: 'Palencia', ccaa: 'Castilla y León', precioM2: 700, precioMedio: 75000 },
  'salamanca': { provincia: 'Salamanca', ccaa: 'Castilla y León', precioM2: 1100, precioMedio: 110000 },
  'segovia': { provincia: 'Segovia', ccaa: 'Castilla y León', precioM2: 900, precioMedio: 100000 },
  'soria': { provincia: 'Soria', ccaa: 'Castilla y León', precioM2: 700, precioMedio: 70000 },
  'valladolid': { provincia: 'Valladolid', ccaa: 'Castilla y León', precioM2: 1200, precioMedio: 120000 },
  'zamora': { provincia: 'Zamora', ccaa: 'Castilla y León', precioM2: 550, precioMedio: 55000 },
  // Cataluña
  'barcelona': { provincia: 'Barcelona', ccaa: 'Cataluña', precioM2: 2800, precioMedio: 270000 },
  'girona': { provincia: 'Girona', ccaa: 'Cataluña', precioM2: 1800, precioMedio: 190000 },
  'lleida': { provincia: 'Lleida', ccaa: 'Cataluña', precioM2: 800, precioMedio: 85000 },
  'tarragona': { provincia: 'Tarragona', ccaa: 'Cataluña', precioM2: 1300, precioMedio: 130000 },
  // Comunidad de Madrid
  'madrid': { provincia: 'Madrid', ccaa: 'Comunidad de Madrid', precioM2: 3000, precioMedio: 300000 },
  // Comunidad Valenciana
  'alicante': { provincia: 'Alicante', ccaa: 'Comunidad Valenciana', precioM2: 1400, precioMedio: 140000 },
  'castellon': { provincia: 'Castellón', ccaa: 'Comunidad Valenciana', precioM2: 800, precioMedio: 85000 },
  'valencia': { provincia: 'Valencia', ccaa: 'Comunidad Valenciana', precioM2: 1300, precioMedio: 130000 },
  // Extremadura
  'badajoz': { provincia: 'Badajoz', ccaa: 'Extremadura', precioM2: 600, precioMedio: 65000 },
  'caceres': { provincia: 'Cáceres', ccaa: 'Extremadura', precioM2: 650, precioMedio: 70000 },
  // Galicia
  'a coruna': { provincia: 'A Coruña', ccaa: 'Galicia', precioM2: 1200, precioMedio: 120000 },
  'coruna': { provincia: 'A Coruña', ccaa: 'Galicia', precioM2: 1200, precioMedio: 120000 },
  'lugo': { provincia: 'Lugo', ccaa: 'Galicia', precioM2: 650, precioMedio: 65000 },
  'ourense': { provincia: 'Ourense', ccaa: 'Galicia', precioM2: 700, precioMedio: 70000 },
  'pontevedra': { provincia: 'Pontevedra', ccaa: 'Galicia', precioM2: 1100, precioMedio: 110000 },
  'vigo': { provincia: 'Pontevedra', ccaa: 'Galicia', precioM2: 1300, precioMedio: 130000 },
  // La Rioja
  'la rioja': { provincia: 'La Rioja', ccaa: 'La Rioja', precioM2: 900, precioMedio: 100000 },
  'logrono': { provincia: 'La Rioja', ccaa: 'La Rioja', precioM2: 1200, precioMedio: 120000 },
  // Murcia
  'murcia': { provincia: 'Murcia', ccaa: 'Región de Murcia', precioM2: 1000, precioMedio: 100000 },
  'cartagena': { provincia: 'Murcia', ccaa: 'Región de Murcia', precioM2: 1000, precioMedio: 100000 },
  // Navarra
  'navarra': { provincia: 'Navarra', ccaa: 'Comunidad Foral de Navarra', precioM2: 1400, precioMedio: 150000 },
  'pamplona': { provincia: 'Navarra', ccaa: 'Comunidad Foral de Navarra', precioM2: 1800, precioMedio: 180000 },
  // País Vasco
  'alava': { provincia: 'Álava', ccaa: 'País Vasco', precioM2: 1800, precioMedio: 180000 },
  'vizcaya': { provincia: 'Vizcaya', ccaa: 'País Vasco', precioM2: 2200, precioMedio: 220000 },
  'bilbao': { provincia: 'Vizcaya', ccaa: 'País Vasco', precioM2: 2500, precioMedio: 250000 },
  'guipuzcoa': { provincia: 'Guipúzcoa', ccaa: 'País Vasco', precioM2: 2500, precioMedio: 250000 },
  'san sebastian': { provincia: 'Guipúzcoa', ccaa: 'País Vasco', precioM2: 3500, precioMedio: 350000 },
  // Ceuta y Melilla
  'ceuta': { provincia: 'Ceuta', ccaa: 'Ceuta', precioM2: 1500, precioMedio: 150000 },
  'melilla': { provincia: 'Melilla', ccaa: 'Melilla', precioM2: 1300, precioMedio: 130000 },
};

function normalizeKey(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Look up market price for a city/province name
 */
export function getProvinceMarketPrice(cityOrProvince: string): ProvinceMarketPrice | null {
  if (!cityOrProvince) return null;
  
  const key = normalizeKey(cityOrProvince);
  
  // Direct lookup
  if (PROVINCE_MARKET_PRICES[key]) return PROVINCE_MARKET_PRICES[key];
  
  // Partial match
  for (const [k, v] of Object.entries(PROVINCE_MARKET_PRICES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  
  return null;
}

/**
 * Validate budget against market data
 */
export function validateBudget(
  valorDeseado: number, 
  ciudad: string
): { realista: boolean; mensaje: string; precioMedio?: number } {
  const market = getProvinceMarketPrice(ciudad);
  if (!market) return { realista: true, mensaje: 'Sin datos de mercado' };
  
  const ratio = valorDeseado / market.precioMedio;
  
  if (ratio > 3) {
    return {
      realista: false,
      mensaje: `⚠️ Presupuesto (${valorDeseado.toLocaleString('es-ES')}€) muy alto para ${market.provincia} (media: ${market.precioMedio.toLocaleString('es-ES')}€)`,
      precioMedio: market.precioMedio,
    };
  }
  if (ratio < 0.2) {
    return {
      realista: false,
      mensaje: `⚠️ Presupuesto (${valorDeseado.toLocaleString('es-ES')}€) muy bajo para ${market.provincia} (media: ${market.precioMedio.toLocaleString('es-ES')}€)`,
      precioMedio: market.precioMedio,
    };
  }
  
  return {
    realista: true,
    mensaje: `Presupuesto realista para ${market.provincia} (media: ${market.precioMedio.toLocaleString('es-ES')}€)`,
    precioMedio: market.precioMedio,
  };
}
