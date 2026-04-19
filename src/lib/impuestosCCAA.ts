/**
 * Tabla de impuestos de transmisión (ITP) por Comunidad Autónoma — España 2025.
 * Tramo general aplicado a vivienda USADA. Para vivienda nueva se usaría IVA 10% + AJD ≈ 1,5%.
 *
 * Fuente única de verdad para calcular los ahorros mínimos requeridos al cliente:
 *   ahorros mínimos = valor del inmueble × % ITP de la CCAA
 */

export const ITP_POR_CCAA: Record<string, number> = {
  'Andalucía': 0.07,
  'Aragón': 0.08,
  'Principado de Asturias': 0.08,
  'Asturias': 0.08,
  'Islas Baleares': 0.08,
  'Baleares': 0.08,
  'Canarias': 0.065,
  'Cantabria': 0.09,
  'Castilla-La Mancha': 0.09,
  'Castilla y León': 0.08,
  'Cataluña': 0.10,
  'Ceuta': 0.06,
  'Comunidad de Madrid': 0.06,
  'Comunidad Valenciana': 0.10,
  'Extremadura': 0.08,
  'Galicia': 0.09,
  'La Rioja': 0.07,
  'Melilla': 0.06,
  'Región de Murcia': 0.08,
  'Murcia': 0.08,
  'Navarra': 0.06,
  'País Vasco': 0.04,
};

/**
 * % medio de seguridad cuando no se conoce la CCAA del lead (ej.: Meta Ads sin dato).
 */
export const ITP_FALLBACK = 0.08;

/**
 * Devuelve el % ITP aplicable a una CCAA. Si no se reconoce, aplica el fallback.
 */
export function getITPPorCCAA(comunidad?: string | null): number {
  if (!comunidad) return ITP_FALLBACK;
  return ITP_POR_CCAA[comunidad] ?? ITP_FALLBACK;
}

/**
 * Calcula los ahorros mínimos que debe tener el cliente para cubrir los impuestos
 * de compraventa (ITP) según la CCAA del inmueble.
 *
 * @param valorInmueble Precio del inmueble en €
 * @param comunidad     Nombre de la CCAA (ej.: "Comunidad de Madrid"). Opcional.
 * @returns             Ahorros mínimos requeridos en €
 */
export function calcularAhorrosMinimos(valorInmueble: number, comunidad?: string | null): number {
  if (!valorInmueble || valorInmueble <= 0) return 0;
  const tasa = getITPPorCCAA(comunidad);
  return Math.round(valorInmueble * tasa);
}
