// ============================================================================
// PRECIO MÍNIMO DE CUALIFICACIÓN POR ÁREA
// Regla adicional y aislada: no toca ninguna otra regla de cualificación.
//
// 1. Se resuelve el municipio oficial (cod_muni) a partir del texto libre del lead.
// 2. CASO B (10 mayores ciudades): precio_m2 del distrito × superficie_ref.
// 3. CASO A (resto): precio_medio del municipio, o media de la CCAA si no hay dato.
// 4. Margen de seguridad: SIEMPRE ×0,80 sobre la base calculada.
// 5. Sin dato de municipio ni de CCAA → "sin dato de precio disponible" (nunca bloquea).
// ============================================================================

import { ZONA_PRECIOS_DATA } from './zonaPreciosData.ts';

/** Margen de seguridad aplicado siempre sobre el precio base (−20%). */
export const MARGEN_SEGURIDAD = 0.80;

/** Superficie de referencia (mediana de mercado) para las 10 mayores ciudades. */
export const SUPERFICIE_CIUDAD_REF = 65;

export type MetodoPrecioMinimo =
  | 'distrito'                 // B1: distrito informado y encontrado
  | 'distrito_mas_barato'      // B3: ciudad grande sin distrito informado
  | 'municipio'                // A(b) / B2: precio_medio del municipio
  | 'media_ccaa'               // A(c): municipio sin dato → media de la CCAA
  | 'sin_dato';                // A(d): sin dato de municipio ni de CCAA

export interface PrecioMinimoZona {
  precio_minimo: number;          // 0 si no hay dato
  precio_base: number;            // antes del margen ×0,80
  metodo: MetodoPrecioMinimo;
  sin_dato: boolean;
  cod_muni: string | null;
  municipio: string | null;
  cod_ccaa: string | null;
  ccaa: string | null;
  distrito: string | null;
  precio_m2: number | null;
  superficie_ref: number | null;
  /** Auditoría: de dónde sale la superficie usada. */
  superficie_origen: 'lead' | 'ciudad' | 'municipio' | null;
  /** Auditoría: nivel de la fuente del precio base. */
  fuente_precio: 'distrito' | 'municipio' | 'ccaa' | null;
  confianza: string | null;
  margen_aplicado: number;
}

// ---------------------------------------------------------------------------
// Normalización de texto (sin acentos, minúsculas, sin puntuación)
// ---------------------------------------------------------------------------
export function normalizarZona(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Variantes de un nombre oficial: "Alicante/Alacant" → ["alicante","alacant"], quita artículos pospuestos. */
function variantesNombre(nombre: string): string[] {
  const out = new Set<string>();
  const partes = String(nombre).split('/');
  for (const p of partes) {
    const base = normalizarZona(p);
    if (!base) continue;
    out.add(base);
    // "Coruña, A" / "Palmas de Gran Canaria, Las" → mueve el artículo al frente y sin él
    const m = p.match(/^(.*),\s*(el|la|los|las|a|o|as|os|l|es|sa)$/i);
    if (m) {
      out.add(normalizarZona(`${m[2]} ${m[1]}`));
      out.add(normalizarZona(m[1]));
    }
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// Índices (se construyen una sola vez por instancia)
// ---------------------------------------------------------------------------
interface MuniRow {
  cod_muni: string;
  name: string;
  cod_ccaa: string;
  ccaa: string;
  precio_medio: number;
  superficie: number;
}

let _muniByCod: Map<string, MuniRow> | null = null;
let _muniByName: Map<string, MuniRow[]> | null = null;
let _muniByCompact: Map<string, MuniRow[]> | null = null;

function buildIndexes() {
  if (_muniByCod && _muniByName && _muniByCompact) return;
  _muniByCod = new Map();
  _muniByName = new Map();
  _muniByCompact = new Map();
  for (const [cod, name, name2, codCcaa, ccaa, precio, sup] of ZONA_PRECIOS_DATA.municipios) {
    const row: MuniRow = {
      cod_muni: cod,
      name,
      cod_ccaa: codCcaa,
      ccaa,
      precio_medio: precio || 0,
      superficie: sup || 0,
    };
    _muniByCod.set(cod, row);
    const claves = new Set<string>([...variantesNombre(name), ...(name2 ? variantesNombre(name2) : [])]);
    for (const k of claves) {
      if (!k) continue;
      const arr = _muniByName.get(k);
      if (arr) arr.push(row);
      else _muniByName.set(k, [row]);
      const kc = k.replace(/\s+/g, '');
      const arc = _muniByCompact.get(kc);
      if (arc) { if (!arc.includes(row)) arc.push(row); }
      else _muniByCompact.set(kc, [row]);
    }
  }
}

function ciudadPorCod(cod: string) {
  return ZONA_PRECIOS_DATA.ciudades.find((c) => c.cod_muni === cod) || null;
}

function mediaCcaa(codCcaa: string): number {
  return ZONA_PRECIOS_DATA.ccaaMedia[codCcaa] || 0;
}

// ---------------------------------------------------------------------------
// Resolución texto libre → cod_muni oficial
// ---------------------------------------------------------------------------
export interface ResolucionZona {
  cod_muni: string | null;
  municipio: string | null;
  cod_ccaa: string | null;
  distrito_texto: string | null;
}

/**
 * Resuelve el municipio oficial a partir del texto libre del lead
 * (ej.: "Vallecas, Madrid", "València", "Alicante/Alacant", "Barcelona - Sant Andreu").
 * El matching posterior usa SIEMPRE el cod_muni devuelto.
 */
/**
 * Devuelve TODOS los municipios plausibles del texto libre del lead
 * (ej.: "Alcorcón, Leganés, Majadahonda" → los tres).
 * El llamador se queda con la referencia MÁS BARATA.
 */
export function resolverMunicipios(...textos: (string | null | undefined)[]): ResolucionZona[] {
  buildIndexes();

  // Trocear todas las entradas por separadores comunes, manteniendo el orden
  const tokens: string[] = [];
  for (const t of textos) {
    if (!t) continue;
    for (const parte of String(t).split(/[,;|\-–—>()./]+/)) {
      const norm = normalizarZona(parte);
      if (norm) tokens.push(norm);
    }
  }
  if (tokens.length === 0) return [];

  // Fix 2026-10-13: provincias/comunidades citadas en el texto. Un municipio cuyo nombre
  // forma parte de una de ellas sin pertenecer a ella se descarta
  // ("la rioja" -> no es Rioja (Almería); "castilla y leon" sigue pudiendo ser León).
  const textoCompleto = ' ' + tokens.join(' ') + ' ';
  const regiones = regionesEnTexto(textoCompleto);
  const valido = (row: MuniRow, nombre: string) =>
    !regiones.some((r) =>
      r.alias !== nombre && contienePalabras(r.alias, nombre) && !r.pertenece(row)
    );
  const mejor = (cands: MuniRow[], nombre: string) => {
    const ok = cands.filter((r) => valido(r, nombre));
    return ok.length ? [...ok].sort((a, b) => (a.precio_medio || 0) - (b.precio_medio || 0))[0] : null;
  };

  const encontrados: { idx: number; row: MuniRow }[] = [];

  // 1) Coincidencia exacta de nombre de municipio (también sin espacios: "arenas de sanpedro")
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    const cands = _muniByName!.get(tok) || _muniByCompact!.get(tok.replace(/\s+/g, ''));
    const row = cands ? mejor(cands, tok) : null;
    if (row) encontrados.push({ idx: i, row });
  }

  // 2) Coincidencia parcial (solo si no hubo ninguna exacta).
  // Fix 2026-10-13: antes se tomaba el primer municipio que empezaba o terminaba el texto
  // ("ronda sant antoni barcelona" -> Ronda). Ahora gana el nombre más largo que aparece
  // como palabras completas al inicio o al final ("huelva palos de la frontera" -> Palos de la Frontera).
  if (encontrados.length === 0) {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tok = tokens[i];
      if (tok.length < 4) continue;
      let best: { nombre: string; row: MuniRow } | null = null;
      for (const [nombre, cands] of _muniByName!) {
        if (nombre.length < 4) continue;
        if (best && nombre.length <= best.nombre.length) continue;
        if (tok === nombre || tok.startsWith(nombre + ' ') || tok.endsWith(' ' + nombre)) {
          const row = mejor(cands, nombre);
          if (row) best = { nombre, row };
        }
      }
      if (best) {
        encontrados.push({ idx: i, row: best.row });
        break;
      }
    }
  }

  if (encontrados.length === 0) return [];

  const vistos = new Set<string>();
  const out: ResolucionZona[] = [];
  for (const { idx, row } of encontrados) {
    if (vistos.has(row.cod_muni)) continue;
    vistos.add(row.cod_muni);
    const otros = tokens.filter((_, k) => k !== idx);
    out.push({
      cod_muni: row.cod_muni,
      municipio: row.name,
      cod_ccaa: row.cod_ccaa,
      distrito_texto: otros.length > 0 ? otros.join(' ') : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Provincias y comunidades autónomas en texto libre (fix 2026-10-13)
// ---------------------------------------------------------------------------
/** Alias normalizado de provincia → código INE de provincia (2 dígitos). */
const PROVINCIA_ALIAS_ZONA: Record<string, string> = {
  'alava': '01', 'araba': '01', 'albacete': '02', 'alicante': '03', 'alacant': '03', 'almeria': '04',
  'avila': '05', 'badajoz': '06', 'baleares': '07', 'illes balears': '07', 'islas baleares': '07',
  'barcelona': '08', 'burgos': '09', 'caceres': '10', 'cadiz': '11', 'castellon': '12', 'castello': '12',
  'ciudad real': '13', 'cordoba': '14', 'coruna': '15', 'a coruna': '15', 'la coruna': '15', 'cuenca': '16',
  'girona': '17', 'gerona': '17', 'granada': '18', 'guadalajara': '19', 'guipuzcoa': '20', 'gipuzkoa': '20',
  'huelva': '21', 'huesca': '22', 'jaen': '23', 'leon': '24', 'lleida': '25', 'lerida': '25',
  'la rioja': '26', 'lugo': '27', 'madrid': '28', 'malaga': '29', 'murcia': '30',
  'navarra': '31', 'ourense': '32', 'orense': '32', 'asturias': '33', 'palencia': '34', 'las palmas': '35',
  'pontevedra': '36', 'salamanca': '37', 'santa cruz de tenerife': '38',
  'cantabria': '39', 'segovia': '40', 'sevilla': '41', 'soria': '42', 'tarragona': '43', 'teruel': '44',
  'toledo': '45', 'valencia': '46', 'valladolid': '47', 'vizcaya': '48', 'bizkaia': '48', 'zamora': '49',
  'zaragoza': '50', 'ceuta': '51', 'melilla': '52',
};

/** Alias normalizado de comunidad autónoma → código de comunidad (mismo que cod_ccaa de los datos). */
const CCAA_ALIAS_ZONA: Record<string, string> = {
  'andalucia': '01', 'aragon': '02', 'asturias': '03', 'principado de asturias': '03',
  'islas baleares': '04', 'illes balears': '04', 'canarias': '05', 'islas canarias': '05',
  'cantabria': '06', 'castilla y leon': '07', 'castilla la mancha': '08',
  'cataluna': '09', 'catalunya': '09', 'comunidad valenciana': '10', 'comunitat valenciana': '10',
  'extremadura': '11', 'galicia': '12', 'comunidad de madrid': '13', 'region de murcia': '14',
  'navarra': '15', 'comunidad foral de navarra': '15', 'pais vasco': '16', 'euskadi': '16',
  'la rioja': '17',
};

interface RegionEnTexto { alias: string; pertenece: (row: MuniRow) => boolean }

function contienePalabras(texto: string, palabras: string): boolean {
  return (' ' + texto + ' ').includes(' ' + palabras + ' ');
}

function regionesEnTexto(texto: string): RegionEnTexto[] {
  const out: RegionEnTexto[] = [];
  for (const [alias, prov] of Object.entries(PROVINCIA_ALIAS_ZONA)) {
    if (contienePalabras(texto, alias)) out.push({ alias, pertenece: (r) => r.cod_muni.slice(0, 2) === prov });
  }
  for (const [alias, ccaa] of Object.entries(CCAA_ALIAS_ZONA)) {
    if (contienePalabras(texto, alias)) out.push({ alias, pertenece: (r) => r.cod_ccaa === ccaa });
  }
  return out;
}

/**
 * Resuelve el municipio oficial a partir del texto libre del lead
 * (ej.: "Vallecas, Madrid", "València", "Alicante/Alacant", "Barcelona - Sant Andreu").
 * El matching posterior usa SIEMPRE el cod_muni devuelto.
 */
export function resolverMunicipio(...textos: (string | null | undefined)[]): ResolucionZona {
  const todos = resolverMunicipios(...textos);
  return todos[0] || { cod_muni: null, municipio: null, cod_ccaa: null, distrito_texto: null };
}

// ---------------------------------------------------------------------------
// Cálculo del precio mínimo de cualificación
// ---------------------------------------------------------------------------
export interface PrecioMinimoInput {
  cod_muni?: string | null;
  /** Distrito/barrio informado por el lead (texto libre). */
  distrito?: string | null;
  /** Metraje deseado informado por el lead (m²). Opcional. */
  superficie_deseada?: number | null;
}

export function calcularPrecioMinimoZona(input: PrecioMinimoInput): PrecioMinimoZona {
  buildIndexes();

  const base: PrecioMinimoZona = {
    precio_minimo: 0,
    precio_base: 0,
    metodo: 'sin_dato',
    sin_dato: true,
    cod_muni: input.cod_muni || null,
    municipio: null,
    cod_ccaa: null,
    ccaa: null,
    distrito: null,
    precio_m2: null,
    superficie_ref: null,
    superficie_origen: null,
    fuente_precio: null,
    confianza: null,
    margen_aplicado: MARGEN_SEGURIDAD,
  };

  if (!input.cod_muni) return base;

  const muni = _muniByCod!.get(input.cod_muni) || null;
  if (muni) {
    base.municipio = muni.name;
    base.cod_ccaa = muni.cod_ccaa;
    base.ccaa = muni.ccaa;
  }

  const finalizar = (precioBase: number, metodo: MetodoPrecioMinimo): PrecioMinimoZona => {
    if (!precioBase || precioBase <= 0) return { ...base, metodo: 'sin_dato', sin_dato: true };
    const fuente: 'distrito' | 'municipio' | 'ccaa' | null =
      metodo === 'distrito' || metodo === 'distrito_mas_barato'
        ? 'distrito'
        : metodo === 'municipio'
          ? 'municipio'
          : metodo === 'media_ccaa'
            ? 'ccaa'
            : null;
    return {
      ...base,
      precio_base: Math.round(precioBase),
      precio_minimo: Math.round(precioBase * MARGEN_SEGURIDAD),
      metodo,
      fuente_precio: fuente,
      sin_dato: false,
    };
  };

  // ---- CASO A/B (municipio): base por precio_medio o media de la CCAA
  // El precio_medio catastral corresponde a la superficie media del municipio
  // (a menudo 100-180 m², chalets incluidos). Se normaliza a la superficie de
  // referencia de mercado (65 m²) para no inflar el mínimo exigido al lead.
  const baseMunicipio = (): PrecioMinimoZona => {
    if (muni && muni.precio_medio > 0) {
      const supMuni = muni.superficie > 0 ? muni.superficie : 0;
      const supRef = input.superficie_deseada && input.superficie_deseada > 0
        ? input.superficie_deseada
        : SUPERFICIE_CIUDAD_REF;
      const precio = supMuni > supRef ? (muni.precio_medio * supRef) / supMuni : muni.precio_medio;
      const r = finalizar(precio, 'municipio');
      if (supMuni > supRef) {
        r.superficie_ref = supRef;
        r.superficie_origen = input.superficie_deseada ? 'lead' : 'municipio';
        r.precio_m2 = Math.round(muni.precio_medio / supMuni);
      }
      return r;
    }
    const media = muni ? mediaCcaa(muni.cod_ccaa) : 0;
    if (media > 0) return finalizar(media, 'media_ccaa');
    return { ...base, metodo: 'sin_dato', sin_dato: true };
  };

  const ciudad = ciudadPorCod(input.cod_muni);
  if (!ciudad) return baseMunicipio();

  // ---- CASO B: una de las 10 mayores ciudades
  // Superficie de referencia: mediana de mercado (65 m²) en vez de la media
  // catastral de la ciudad (89-115 m²), que inflaba el precio mínimo.
  const superficieDeLead = !!(input.superficie_deseada && input.superficie_deseada > 0);
  const superficieRef = superficieDeLead
    ? (input.superficie_deseada as number)
    : SUPERFICIE_CIUDAD_REF;
  const superficieOrigen: 'lead' | 'ciudad' | 'municipio' | null = superficieDeLead
    ? 'lead'
    : 'ciudad';


  const distritoTexto = normalizarZona(input.distrito);

  let refDistrito: PrecioMinimoZona | null = null;

  // B1: distrito informado y presente en la lista de la ciudad
  const match = distritoTexto
    ? ciudad.distritos.find((d) => {
        const n = normalizarZona(d.d);
        if (!n) return false;
        if (n === distritoTexto) return true;
        if (distritoTexto.includes(n) || n.includes(distritoTexto)) return true;
        // "Puente de Vallecas" ↔ "Vallecas": comparar por palabras significativas
        const partes = n.split(' ').filter((p) => p.length > 3);
        return partes.some((p) => distritoTexto.split(' ').includes(p));
      })
    : undefined;

  if (match && superficieRef > 0) {
    const r = finalizar(match.m2 * superficieRef, 'distrito');
    r.distrito = match.d;
    r.precio_m2 = match.m2;
    r.superficie_ref = superficieRef;
    r.superficie_origen = superficieOrigen;
    r.confianza = match.c || null;
    refDistrito = r;
  } else {
    // B3: sin distrito informado, o texto que no corresponde a ningún distrito
    // conocido ("alrededores", "o fuera", "sur") → distrito más barato de la ciudad.
    const masBarato = [...ciudad.distritos].sort((a, b) => a.m2 - b.m2)[0];
    if (masBarato && superficieRef > 0) {
      const r = finalizar(masBarato.m2 * superficieRef, 'distrito_mas_barato');
      r.distrito = masBarato.d;
      r.precio_m2 = masBarato.m2;
      r.superficie_ref = superficieRef;
      r.superficie_origen = superficieOrigen;
      r.confianza = masBarato.c || null;
      refDistrito = r;
    }
  }

  const refMunicipio = baseMunicipio();

  // Regla: usar SIEMPRE la referencia más barata disponible (distrito vs municipio/CCAA)
  // para no descualificar a un lead que sí puede comprar en alguna de las dos.
  const candidatos = [refDistrito, refMunicipio].filter(
    (r): r is PrecioMinimoZona => !!r && !r.sin_dato && r.precio_minimo > 0,
  );
  if (candidatos.length === 0) return refDistrito || refMunicipio;

  return candidatos.sort((a, b) => a.precio_minimo - b.precio_minimo)[0];
}


// ---------------------------------------------------------------------------
// Evaluación de cualificación por precio de área
// ---------------------------------------------------------------------------
export interface EvaluacionPrecioZona extends PrecioMinimoZona {
  max_financiable: number;
  cualificado: boolean;
  razon: string | null;
}

/**
 * Cualificación 100% automática por precio mínimo de la zona.
 * - sin dato → cualificado (no bloquea, se marca `sin_dato`).
 * - max_financiable < precio_minimo → NO cualificado.
 */
export function evaluarPrecioMinimoZona(params: {
  maxFinanciable: number;
  zonaTexto?: string | null;
  ciudadTexto?: string | null;
  distritoTexto?: string | null;
  superficieDeseada?: number | null;
  codMuni?: string | null;
}): EvaluacionPrecioZona {
  const resoluciones: ResolucionZona[] = params.codMuni
    ? [{ cod_muni: params.codMuni, municipio: null, cod_ccaa: null, distrito_texto: params.distritoTexto || null }]
    : resolverMunicipios(params.zonaTexto, params.ciudadTexto);

  // Si el lead menciona varias zonas, vale la MÁS BARATA de todas.
  const calculados = resoluciones.map((r) =>
    calcularPrecioMinimoZona({
      cod_muni: r.cod_muni,
      distrito: params.distritoTexto || r.distrito_texto,
      superficie_deseada: params.superficieDeseada ?? null,
    }),
  );
  const validos = calculados.filter((p) => !p.sin_dato && p.precio_minimo > 0);
  const precio = validos.length > 0
    ? validos.sort((a, b) => a.precio_minimo - b.precio_minimo)[0]
    : calcularPrecioMinimoZona({
        cod_muni: resoluciones[0]?.cod_muni ?? null,
        distrito: params.distritoTexto || resoluciones[0]?.distrito_texto || null,
        superficie_deseada: params.superficieDeseada ?? null,
      });


  const maxFin = Math.max(Number(params.maxFinanciable) || 0, 0);

  if (precio.sin_dato) {
    return { ...precio, max_financiable: maxFin, cualificado: true, razon: null };
  }

  const ok = maxFin >= precio.precio_minimo;
  return {
    ...precio,
    max_financiable: maxFin,
    cualificado: ok,
    razon: ok
      ? null
      : `Presupuesto por debajo del mínimo de la zona (${precio.precio_minimo.toLocaleString('es-ES')}€ en ${
          precio.distrito ? `${precio.distrito}, ` : ''
        }${precio.municipio || 'la zona indicada'}; máximo del lead: ${maxFin.toLocaleString('es-ES')}€)`,
  };
}
