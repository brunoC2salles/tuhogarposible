/**
 * Lista oficial de Comunidades Autónomas disponibles para el Round-Robin de agentes
 */
export const COMUNIDADES_AUTONOMAS = [
  'Andalucía',
  'Aragón',
  'Principado de Asturias',
  'Islas Baleares',
  'Canarias',
  'Cantabria',
  'Castilla-La Mancha',
  'Castilla y León',
  'Cataluña',
  'Ceuta',
  'Comunidad de Madrid',
  'Comunidad Valenciana',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Melilla',
  'Región de Murcia',
] as const;

export type ComunidadAutonoma = typeof COMUNIDADES_AUTONOMAS[number];
