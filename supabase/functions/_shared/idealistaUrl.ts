// ============================================================================
// SHARED — URL de búsqueda de Idealista para el lead (WhatsApp vía Spoki/Make)
//
// Formato validado manualmente (2026-09-30):
//   https://www.idealista.com/venta-viviendas/{municipio}-{provincia}/con-precio-hasta_{monto}/
//   - precio: monto_maximo_financiable (entero, sin redondear)
//   - dormitorios: NO se aplica desde 2026-09-30 (filtrosDormitorios queda disponible pero sin uso)
// Municipio: {nombre INE con ambas lenguas}-{provincia} (ej. castellon-de-la-plana-castello-de-la-plana-castellon)
// Sin municipio reconocido (decisión 2026-09-30):
//   - Solo provincia → capital de la provincia (ej. "Zaragoza" → zaragoza-zaragoza).
//   - Solo comunidad autónoma → capital de la comunidad (ej. "Aragón" → zaragoza-zaragoza,
//     "Galicia" → santiago-de-compostela-a-coruna). Canarias (capitalidad compartida) queda sin enlace.
//   (/{provincia}-provincia/ ya no se usa; segmentoProvincia queda disponible sin uso)
// Excepciones verificadas en MUNICIPIO_SLUG_OVERRIDE.
// Sin municipio ni provincia → '' (no se envía enlace).
// ============================================================================

import { normalizarZona } from './precioMinimoZona.ts';
import { ZONA_PRECIOS_DATA } from './zonaPreciosData.ts';

const BASE = 'https://www.idealista.com/venta-viviendas';

/** Código INE de provincia (2 primeros dígitos del cod_muni) → slug Idealista. */
export const PROVINCIA_SLUG: Record<string, string> = {
  '01': 'alava', '02': 'albacete', '03': 'alicante', '04': 'almeria', '05': 'avila',
  '06': 'badajoz', '07': 'balears-illes', '08': 'barcelona', '09': 'burgos', '10': 'caceres',
  '11': 'cadiz', '12': 'castellon', '13': 'ciudad-real', '14': 'cordoba', '15': 'a-coruna',
  '16': 'cuenca', '17': 'girona', '18': 'granada', '19': 'guadalajara', '20': 'guipuzcoa',
  '21': 'huelva', '22': 'huesca', '23': 'jaen', '24': 'leon', '25': 'lleida',
  '26': 'la-rioja', '27': 'lugo', '28': 'madrid', '29': 'malaga', '30': 'murcia',
  '31': 'navarra', '32': 'ourense', '33': 'asturias', '34': 'palencia', '35': 'las-palmas',
  '36': 'pontevedra', '37': 'salamanca', '38': 'santa-cruz-de-tenerife', '39': 'cantabria', '40': 'segovia',
  '41': 'sevilla', '42': 'soria', '43': 'tarragona', '44': 'teruel', '45': 'toledo',
  '46': 'valencia', '47': 'valladolid', '48': 'vizcaya', '49': 'zamora', '50': 'zaragoza',
  '51': 'ceuta', '52': 'melilla',
};

/** Código INE de provincia → cod_muni INE de su capital. */
export const CAPITAL_PROVINCIA: Record<string, string> = {
  '01': '01059', '02': '02003', '03': '03014', '04': '04013', '05': '05019', '06': '06015',
  '07': '07040', '08': '08019', '09': '09059', '10': '10037', '11': '11012', '12': '12040',
  '13': '13034', '14': '14021', '15': '15030', '16': '16078', '17': '17079', '18': '18087',
  '19': '19130', '20': '20069', '21': '21041', '22': '22125', '23': '23050', '24': '24089',
  '25': '25120', '26': '26089', '27': '27028', '28': '28079', '29': '29067', '30': '30030',
  '31': '31201', '32': '32054', '33': '33044', '34': '34120', '35': '35016', '36': '36038',
  '37': '37274', '38': '38038', '39': '39075', '40': '40194', '41': '41091', '42': '42173',
  '43': '43148', '44': '44216', '45': '45168', '46': '46250', '47': '47186', '48': '48020',
  '49': '49275', '50': '50297', '51': '51001', '52': '52001',
};

/** Comunidad autónoma en texto libre → cod_muni INE de su capital (solo si no hay provincia). */
const CCAA_CAPITAL_ALIAS: Record<string, string> = {
  'andalucia': '41091',
  'aragon': '50297',
  'principado de asturias': '33044',
  'islas baleares': '07040', 'illes balears': '07040',
  'cantabria': '39075',
  'castilla y leon': '47186',
  'castilla la mancha': '45168',
  'cataluna': '08019', 'catalunya': '08019',
  'comunidad valenciana': '46250', 'comunitat valenciana': '46250', 'pais valenciano': '46250',
  'extremadura': '06083',
  'galicia': '15078',
  'comunidad de madrid': '28079',
  'region de murcia': '30030',
  'comunidad foral de navarra': '31201',
  'pais vasco': '01059', 'euskadi': '01059',
  'la rioja': '26089',
};

/** Nombres/variantes de provincia en texto libre → código INE (fallback sin municipio). */
const PROVINCIA_ALIAS: Record<string, string> = {
  'alava': '01', 'araba': '01', 'albacete': '02', 'alicante': '03', 'alacant': '03', 'almeria': '04',
  'avila': '05', 'badajoz': '06', 'baleares': '07', 'illes balears': '07', 'islas baleares': '07', 'mallorca': '07',
  'barcelona': '08', 'burgos': '09', 'caceres': '10', 'cadiz': '11', 'castellon': '12', 'castello': '12',
  'ciudad real': '13', 'cordoba': '14', 'coruna': '15', 'a coruna': '15', 'la coruna': '15', 'cuenca': '16',
  'girona': '17', 'gerona': '17', 'granada': '18', 'guadalajara': '19', 'guipuzcoa': '20', 'gipuzkoa': '20',
  'huelva': '21', 'huesca': '22', 'jaen': '23', 'leon': '24', 'lleida': '25', 'lerida': '25',
  'la rioja': '26', 'rioja': '26', 'lugo': '27', 'madrid': '28', 'malaga': '29', 'murcia': '30',
  'navarra': '31', 'ourense': '32', 'orense': '32', 'asturias': '33', 'palencia': '34', 'las palmas': '35',
  'gran canaria': '35', 'pontevedra': '36', 'salamanca': '37', 'tenerife': '38', 'santa cruz de tenerife': '38',
  'cantabria': '39', 'segovia': '40', 'sevilla': '41', 'soria': '42', 'tarragona': '43', 'teruel': '44',
  'toledo': '45', 'valencia': '46', 'valladolid': '47', 'vizcaya': '48', 'bizkaia': '48', 'zamora': '49',
  'zaragoza': '50', 'ceuta': '51', 'melilla': '52',
};

const DORMITORIOS: Record<number, string> = {
  1: 'de-un-dormitorio',
  2: 'de-dos-dormitorios',
  3: 'de-tres-dormitorios',
  4: 'de-cuatro-cinco-habitaciones-o-mas',
};

function slug(text: string): string {
  return normalizarZona(text).replace(/\s+/g, '-');
}

/** cod_muni INE → slug de municipio en Idealista cuando no sigue la regla general (verificados a mano). */
export const MUNICIPIO_SLUG_OVERRIDE: Record<string, string> = {
  '07040': 'palma-de-mallorca',
};

/**
 * Nombre oficial INE → slug de municipio.
 * Nombres bilingües se unen: "Castellón de la Plana/Castelló de la Plana" → "castellon-de-la-plana-castello-de-la-plana".
 * Artículo pospuesto se antepone: "Coruña, A" → "a-coruna".
 */
export function slugMunicipio(nombre: string, codMuni?: string | null): string {
  if (codMuni && MUNICIPIO_SLUG_OVERRIDE[codMuni]) return MUNICIPIO_SLUG_OVERRIDE[codMuni];
  const partes = String(nombre).split('/').map((p) => {
    const m = p.trim().match(/^(.*),\s*(el|la|los|las|a|o|as|os|l|es|sa)$/i);
    return m ? `${m[2]} ${m[1]}` : p.trim();
  });
  return slug(partes.join(' '));
}

/**
 * Texto libre de habitaciones → filtros de dormitorios.
 * - Cada número mencionado entra ("3/4" → 3 y 4+).
 * - "mínimo N", "N+", "N o más" → N y todos los superiores.
 * - Sin número → sin filtro.
 */
export function filtrosDormitorios(texto?: string | number | null): string[] {
  if (texto === null || texto === undefined || texto === '') return [];
  const t = normalizarZona(String(texto).replace(/\+/g, ' mas '));
  const nums = (t.match(/\d+/g) || []).map((n) => Math.min(Math.max(parseInt(n, 10), 1), 4));
  if (nums.length === 0) return [];
  const set = new Set<number>(nums);
  if (/\b(minimo|min|mas|o mas|al menos|desde)\b/.test(t)) {
    for (let n = Math.min(...nums); n <= 4; n++) set.add(n);
  }
  return [...set].sort((a, b) => a - b).map((n) => DORMITORIOS[n]);
}

let _provinciasConMunicipioHomonimo: Set<string> | null = null;

/** Segmento de URL de provincia: "{slug}-provincia" si choca con un municipio de la misma provincia. */
export function segmentoProvincia(codProv: string): string {
  const provSlug = PROVINCIA_SLUG[codProv];
  if (!provSlug) return '';
  if (!_provinciasConMunicipioHomonimo) {
    _provinciasConMunicipioHomonimo = new Set();
    for (const [cod, name] of ZONA_PRECIOS_DATA.municipios) {
      const cp = String(cod).slice(0, 2);
      if (PROVINCIA_SLUG[cp] && slugMunicipio(name, cod) === PROVINCIA_SLUG[cp]) {
        _provinciasConMunicipioHomonimo.add(cp);
      }
    }
  }
  return _provinciasConMunicipioHomonimo.has(codProv) ? `${provSlug}-provincia` : provSlug;
}

function provinciaDesdeTexto(...textos: (string | null | undefined)[]): string | null {
  for (const t of textos) {
    if (!t) continue;
    const norm = normalizarZona(t);
    // Coincidencia más larga primero ("santa cruz de tenerife" antes que "tenerife")
    const aliases = Object.keys(PROVINCIA_ALIAS).sort((a, b) => b.length - a.length);
    for (const a of aliases) {
      if (new RegExp(`(^|\\s)${a}(\\s|$)`).test(norm)) return PROVINCIA_ALIAS[a];
    }
  }
  return null;
}

let _nombresMunicipio: Map<string, string> | null = null;

function nombreMunicipio(codMuni: string): string | null {
  if (!_nombresMunicipio) {
    _nombresMunicipio = new Map();
    for (const [cod, name] of ZONA_PRECIOS_DATA.municipios) _nombresMunicipio.set(String(cod), name);
  }
  return _nombresMunicipio.get(codMuni) ?? null;
}

/**
 * Sin municipio reconocido: devuelve la capital de la provincia o, si solo hay
 * comunidad autónoma, la capital de la comunidad. Coincidencia más larga primero
 * ("castilla y leon" antes que "leon", "la rioja" como comunidad = provincia).
 */
function capitalDesdeTexto(
  ...textos: (string | null | undefined)[]
): { codMuni: string; nivel: 'capital_provincia' | 'capital_ccaa' } | null {
  const candidatos: [string, string, 'capital_provincia' | 'capital_ccaa'][] = [
    ...Object.entries(PROVINCIA_ALIAS).map(([a, cp]) => [a, CAPITAL_PROVINCIA[cp], 'capital_provincia'] as [string, string, 'capital_provincia']),
    ...Object.entries(CCAA_CAPITAL_ALIAS).map(([a, cm]) => [a, cm, 'capital_ccaa'] as [string, string, 'capital_ccaa']),
  ].sort((x, y) => y[0].length - x[0].length);
  for (const t of textos) {
    if (!t) continue;
    const norm = normalizarZona(t);
    for (const [alias, codMuni, nivel] of candidatos) {
      if (codMuni && new RegExp(`(^|\\s)${alias}(\\s|$)`).test(norm)) return { codMuni, nivel };
    }
  }
  return null;
}

export function buildIdealistaUrl(params: {
  codMuni?: string | null;
  municipio?: string | null;
  zonaTexto?: string | null;
  ciudadTexto?: string | null;
  montoMaxFinanciable: number;
  habitaciones?: string | number | null;
}): { url: string; nivel: 'municipio' | 'capital_provincia' | 'capital_ccaa' | 'sin_dato' } {
  let ubicacion = '';
  let nivel: 'municipio' | 'capital_provincia' | 'capital_ccaa' | 'sin_dato' = 'sin_dato';

  const codProv = params.codMuni ? params.codMuni.slice(0, 2) : null;
  const provSlug = codProv ? PROVINCIA_SLUG[codProv] : null;

  if (params.municipio && provSlug) {
    ubicacion = `${slugMunicipio(params.municipio, params.codMuni)}-${provSlug}`;
    nivel = 'municipio';
  } else {
    const capital = capitalDesdeTexto(params.zonaTexto, params.ciudadTexto);
    if (capital) {
      const provCap = PROVINCIA_SLUG[capital.codMuni.slice(0, 2)];
      const nombre = nombreMunicipio(capital.codMuni);
      if (provCap && nombre) {
        ubicacion = `${slugMunicipio(nombre, capital.codMuni)}-${provCap}`;
        nivel = capital.nivel;
      }
    }
  }

  if (!ubicacion) return { url: '', nivel };

  const filtros: string[] = [];
  const monto = Math.floor(Number(params.montoMaxFinanciable) || 0);
  if (monto > 0) filtros.push(`con-precio-hasta_${monto}`);
  // Sin filtro de dormitorios (decisión 2026-09-30): solo zona + precio máximo.

  const url = filtros.length > 0 ? `${BASE}/${ubicacion}/${filtros.join(',')}/` : `${BASE}/${ubicacion}/`;
  return { url, nivel };
}
