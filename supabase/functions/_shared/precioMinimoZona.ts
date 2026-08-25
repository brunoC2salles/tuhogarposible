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
    .replace(/[\u0300-\u036f]/g, '')
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

function buildIndexes() {
  if (_muniByCod && _muniByName) return;
  _muniByCod = new Map();
  _muniByName = new Map();
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
export function resolverMunicipio(...textos: (string | null | undefined)[]): ResolucionZona {
  buildIndexes();
  const vacio: ResolucionZona = { cod_muni: null, municipio: null, cod_ccaa: null, distrito_texto: null };

  // Trocear todas las entradas por separadores comunes, manteniendo el orden
  const tokens: string[] = [];
  for (const t of textos) {
    if (!t) continue;
    for (const parte of String(t).split(/[,;|\-–—>()]+/)) {
      const norm = normalizarZona(parte);
      if (norm) tokens.push(norm);
    }
  }
  if (tokens.length === 0) return vacio;

  // 1) Coincidencia exacta de nombre de municipio (preferimos el municipio con más peso: mayor precio_medio informado)
  for (let i = tokens.length - 1; i >= 0; i--) {
    const cands = _muniByName!.get(tokens[i]);
    if (cands && cands.length > 0) {
      const row = [...cands].sort((a, b) => (b.precio_medio || 0) - (a.precio_medio || 0))[0];
      // El resto de tokens (distintos del municipio) se consideran distrito/barrio
      const otros = tokens.filter((_, idx) => idx !== i);
      return {
        cod_muni: row.cod_muni,
        municipio: row.name,
        cod_ccaa: row.cod_ccaa,
        distrito_texto: otros.length > 0 ? otros.join(' ') : null,
      };
    }
  }

  // 2) Coincidencia parcial: el token contiene el nombre del municipio o viceversa (solo nombres largos)
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    if (tok.length < 4) continue;
    for (const [nombre, cands] of _muniByName!) {
      if (nombre.length < 4) continue;
      if (tok === nombre || tok.startsWith(nombre + ' ') || tok.endsWith(' ' + nombre)) {
        const row = [...cands].sort((a, b) => (b.precio_medio || 0) - (a.precio_medio || 0))[0];
        // El resto del token (quitando el nombre del municipio) puede ser el distrito
        const resto = tok.replace(nombre, ' ').replace(/\s+/g, ' ').trim();
        const otros = tokens.filter((_, idx) => idx !== i);
        const restoEsMismoMunicipio = resto
          ? (_muniByName!.get(resto) || []).some((r) => r.cod_muni === row.cod_muni)
          : false;
        if (resto && !restoEsMismoMunicipio) otros.push(resto);
        return {
          cod_muni: row.cod_muni,
          municipio: row.name,
          cod_ccaa: row.cod_ccaa,
          distrito_texto: otros.length > 0 ? otros.join(' ') : null,
        };
      }
    }
  }

  return vacio;
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
  const baseMunicipio = (): PrecioMinimoZona => {
    if (muni && muni.precio_medio > 0) return finalizar(muni.precio_medio, 'municipio');
    const media = muni ? mediaCcaa(muni.cod_ccaa) : 0;
    if (media > 0) return finalizar(media, 'media_ccaa');
    return { ...base, metodo: 'sin_dato', sin_dato: true };
  };

  const ciudad = ciudadPorCod(input.cod_muni);
  if (!ciudad) return baseMunicipio();

  // ---- CASO B: una de las 10 mayores ciudades
  const superficieRef =
    input.superficie_deseada && input.superficie_deseada > 0
      ? input.superficie_deseada
      : ciudad.sup || muni?.superficie || 0;

  const distritoTexto = normalizarZona(input.distrito);

  if (distritoTexto) {
    // B1: distrito informado y presente en la lista de la ciudad
    const match = ciudad.distritos.find((d) => {
      const n = normalizarZona(d.d);
      if (!n) return false;
      if (n === distritoTexto) return true;
      if (distritoTexto.includes(n) || n.includes(distritoTexto)) return true;
      // "Puente de Vallecas" ↔ "Vallecas": comparar por palabras significativas
      const partes = n.split(' ').filter((p) => p.length > 3);
      return partes.some((p) => distritoTexto.split(' ').includes(p));
    });

    if (match && superficieRef > 0) {
      const r = finalizar(match.m2 * superficieRef, 'distrito');
      r.distrito = match.d;
      r.precio_m2 = match.m2;
      r.superficie_ref = superficieRef;
      r.confianza = match.c || null;
      return r;
    }
    // B2: distrito informado pero no cubierto → fallback municipio
    return baseMunicipio();
  }

  // B3: solo ciudad → distrito más barato de la lista
  const masBarato = [...ciudad.distritos].sort((a, b) => a.m2 - b.m2)[0];
  if (masBarato && superficieRef > 0) {
    const r = finalizar(masBarato.m2 * superficieRef, 'distrito_mas_barato');
    r.distrito = masBarato.d;
    r.precio_m2 = masBarato.m2;
    r.superficie_ref = superficieRef;
    r.confianza = masBarato.c || null;
    return r;
  }

  return baseMunicipio();
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
  const resol = params.codMuni
    ? { cod_muni: params.codMuni, municipio: null, cod_ccaa: null, distrito_texto: params.distritoTexto || null }
    : resolverMunicipio(params.zonaTexto, params.ciudadTexto);

  const precio = calcularPrecioMinimoZona({
    cod_muni: resol.cod_muni,
    distrito: params.distritoTexto || resol.distrito_texto,
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
