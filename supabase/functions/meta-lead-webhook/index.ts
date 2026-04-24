import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateBudget, getProvinceMarketPrice } from '../_shared/marketPrices.ts';
import { correctEmail } from '../_shared/emailCorrection.ts';
import { buildBitrixPayloadFromLead } from '../_shared/bitrixPayload.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de rangos de ingresos para valor numérico
const RANGO_INGRESOS_MAP: Record<string, number> = {
  'menos de 1000€': 900,
  'menos de 1000': 900,
  '1000-1500€': 1250,
  '1000-1500': 1250,
  '1500-2000€': 1750,
  '1500-2000': 1750,
  '2000-2500€': 2250,
  '2000-2500': 2250,
  '2500-3000€': 2750,
  '2500-3000': 2750,
  'más de 3000€': 3500,
  'más de 3000': 3500,
  'mas de 3000€': 3500,
  'mas de 3000': 3500,
};

// Mapeamento de cidades/termos para comunidades autónomas
const CIUDADES_COMUNIDAD_MAP: Record<string, string> = {
  // Cataluña
  'barcelona': 'Cataluña', 'tarragona': 'Cataluña', 'girona': 'Cataluña', 'lleida': 'Cataluña',
  'catalunya': 'Cataluña', 'cataluña': 'Cataluña',
  // Comunidad de Madrid
  'madrid': 'Comunidad de Madrid',
  // Comunidad Valenciana
  'valencia': 'Comunidad Valenciana', 'alicante': 'Comunidad Valenciana', 'castellón': 'Comunidad Valenciana',
  'castellon': 'Comunidad Valenciana',
  // Andalucía
  'sevilla': 'Andalucía', 'málaga': 'Andalucía', 'malaga': 'Andalucía', 'granada': 'Andalucía',
  'córdoba': 'Andalucía', 'cordoba': 'Andalucía', 'almería': 'Andalucía', 'almeria': 'Andalucía',
  'cádiz': 'Andalucía', 'cadiz': 'Andalucía', 'jaén': 'Andalucía', 'jaen': 'Andalucía',
  'huelva': 'Andalucía', 'andalucía': 'Andalucía', 'andalucia': 'Andalucía',
  // Aragón
  'zaragoza': 'Aragón', 'huesca': 'Aragón', 'teruel': 'Aragón', 'aragón': 'Aragón', 'aragon': 'Aragón',
  // Región de Murcia
  'murcia': 'Región de Murcia',
  // Islas Baleares
  'palma': 'Islas Baleares', 'mallorca': 'Islas Baleares', 'ibiza': 'Islas Baleares',
  'menorca': 'Islas Baleares', 'baleares': 'Islas Baleares',
  // Canarias
  'tenerife': 'Canarias', 'gran canaria': 'Canarias', 'las palmas': 'Canarias',
  'canarias': 'Canarias', 'lanzarote': 'Canarias', 'fuerteventura': 'Canarias',
  // Galicia
  'vigo': 'Galicia', 'coruña': 'Galicia', 'santiago': 'Galicia', 'pontevedra': 'Galicia',
  'lugo': 'Galicia', 'ourense': 'Galicia', 'galicia': 'Galicia',
  // Cantabria
  'santander': 'Cantabria', 'cantabria': 'Cantabria',
  // Principado de Asturias
  'gijón': 'Principado de Asturias', 'gijon': 'Principado de Asturias', 'oviedo': 'Principado de Asturias',
  'asturias': 'Principado de Asturias',
  // Castilla y León
  'valladolid': 'Castilla y León', 'salamanca': 'Castilla y León', 'león': 'Castilla y León',
  'leon': 'Castilla y León', 'burgos': 'Castilla y León', 'segovia': 'Castilla y León',
  'ávila': 'Castilla y León', 'avila': 'Castilla y León', 'soria': 'Castilla y León',
  'zamora': 'Castilla y León', 'palencia': 'Castilla y León', 'ponferrada': 'Castilla y León',
  // Castilla-La Mancha
  'toledo': 'Castilla-La Mancha', 'ciudad real': 'Castilla-La Mancha', 'albacete': 'Castilla-La Mancha',
  'cuenca': 'Castilla-La Mancha', 'guadalajara': 'Castilla-La Mancha',
  'alovera': 'Castilla-La Mancha', 'seseña': 'Castilla-La Mancha', 'sesena': 'Castilla-La Mancha',
  'yuncos': 'Castilla-La Mancha', 'illescas': 'Castilla-La Mancha',
  // Extremadura
  'cáceres': 'Extremadura', 'caceres': 'Extremadura', 'badajoz': 'Extremadura', 'extremadura': 'Extremadura',
  // La Rioja
  'logroño': 'La Rioja', 'logronyo': 'La Rioja', 'rioja': 'La Rioja',
  // Cidades adicionais (Comunidad de Madrid)
  'colmenar viejo': 'Comunidad de Madrid', 'mostoles': 'Comunidad de Madrid', 'móstoles': 'Comunidad de Madrid',
  'leganes': 'Comunidad de Madrid', 'leganés': 'Comunidad de Madrid', 'pinto': 'Comunidad de Madrid',
  'getafe': 'Comunidad de Madrid', 'alcobendas': 'Comunidad de Madrid', 'alcalá': 'Comunidad de Madrid',
  'alcala': 'Comunidad de Madrid', 'torrejon': 'Comunidad de Madrid', 'torrejón': 'Comunidad de Madrid',
  'vallecas': 'Comunidad de Madrid', 'fuenlabrada': 'Comunidad de Madrid', 'parla': 'Comunidad de Madrid',
  'arganda': 'Comunidad de Madrid', 'rivas': 'Comunidad de Madrid', 'coslada': 'Comunidad de Madrid',
  // Cidades adicionais (Cataluña)
  'sabadell': 'Cataluña', 'terrassa': 'Cataluña', 'hospitalet': 'Cataluña', 'llobregat': 'Cataluña',
  'badalona': 'Cataluña', 'mataró': 'Cataluña', 'mataro': 'Cataluña', 'reus': 'Cataluña',
  'vilanova': 'Cataluña', 'geltru': 'Cataluña', 'olot': 'Cataluña', 'manresa': 'Cataluña',
  'valles': 'Cataluña', 'vallès': 'Cataluña',
  // Cidades adicionais (Comunidad Valenciana)
  'paterna': 'Comunidad Valenciana', 'benidorm': 'Comunidad Valenciana', 'elche': 'Comunidad Valenciana',
  'torrevieja': 'Comunidad Valenciana', 'gandia': 'Comunidad Valenciana',
  // Cidades adicionais (Canarias)
  'puerto del rosario': 'Canarias',
  // Cidades adicionais (Región de Murcia)
  'la alberca': 'Región de Murcia', 'cartagena': 'Región de Murcia', 'lorca': 'Región de Murcia',
};

interface MetaLeadData {
  nombre: string;
  telefono: string;
  email: string;
  antiguedad_trabajo?: string;
  tiene_nie_dni?: string;
  en_fichero_morosidad?: string;
  preferencia_llamada?: string;
  edad?: number | string;
  age?: number | string;
  birth_year?: number | string;
  ano_nacimiento?: number | string;
  fecha_nacimiento?: string;
  habitaciones?: number;
  zona_interes?: string;
  rango_ingresos?: string;
  deudas_mensuales?: number;
  // Novos campos do formulário Meta Ads
  tiene_ahorros_impuestos?: string;
  monto_ahorros?: string | number;
  tiene_vivienda_seleccionada?: string;
}

interface QualificationResult {
  cualificado: boolean;
  razon_no_cualificado?: string;
}

// ============= FUNÇÕES DE SANITIZAÇÃO =============
// Resolve o erro "Bad control character in string literal in JSON"
// que ocorre quando campos do Facebook Ads contêm quebras de linha, tabs, etc.

function sanitizeJsonString(str: string): string {
  // Substitui caracteres de controle por escapes válidos ou espaços
  return str.replace(/[\x00-\x1F\x7F]/g, (char) => {
    switch (char) {
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '\t': return '\\t';
      default: return ' ';
    }
  });
}

function sanitizeField(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove caracteres de controle e faz trim
    return value.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
  }
  return value;
}

// ============= FUNÇÕES DE PARSING PARA RESPOSTAS ABERTAS DO META ADS =============

/**
 * Parseia resposta de DNI/NIE - aceita "dni", "nie", "pasaporte", "sí", "no"
 */
function parseTieneDniNie(respuesta?: string): { tiene: boolean; tipo?: string } {
  if (!respuesta) return { tiene: false };
  
  const resp = respuesta.toLowerCase().trim().replace(/_/g, ' ');
  
  // Respostas diretas indicando tipo de documento
  if (resp.includes('dni') || resp.includes('nie') || resp.includes('pasaporte')) {
    return { tiene: true, tipo: resp };
  }
  
  // Respostas afirmativas genéricas
  if (resp === 'si' || resp === 'sí' || resp.includes('tengo') || resp === 'yes') {
    return { tiene: true };
  }
  
  // Respostas negativas
  if (resp === 'no' || resp.includes('no tengo') || resp.includes('en tramite') || resp.includes('en trámite')) {
    return { tiene: false };
  }
  
  // Se respondeu algo, assumir que tem (melhor ser permissivo)
  return { tiene: true, tipo: resp };
}

/**
 * Parseia antigüedad laboral - aceita formatos com underscore como "más_de_1_año"
 */
function parseAntiguedad(respuesta?: string): { suficiente: boolean; valor?: string; tipo_contrato?: string } {
  if (!respuesta) return { suficiente: false };
  
  // Normaliza: remove underscores, lowercase
  const resp = respuesta.toLowerCase().trim().replace(/_/g, ' ');
  
  // CONTRATOS PRECÁRIOS - DESQUALIFICA (verificar ANTES de verificar "fijo")
  if (
    resp.includes('fijo discontinuo') ||
    resp.includes('discontinuo') ||
    resp.includes('temporal') ||
    resp.includes('por obra') ||
    resp.includes('obra y servicio') ||
    resp.includes('practicas') ||
    resp.includes('prácticas') ||
    resp.includes('formacion') ||
    resp.includes('formación') ||
    resp.includes('interinidad') ||
    resp.includes('eventual')
  ) {
    return { suficiente: false, valor: respuesta, tipo_contrato: 'precario' };
  }
  
  // Insuficiente: menos de 1 año
  if (
    resp.includes('menos de 1') || 
    resp.includes('menos de un') || 
    resp === '0' || 
    resp === 'no' ||
    resp.includes('< 1') ||
    resp.includes('0 meses') ||
    resp.includes('ninguna')
  ) {
    return { suficiente: false, valor: respuesta };
  }
  
  // Suficiente: 1+ años (variações) - agora seguro pois já excluímos contratos precários
  if (
    resp.includes('más de 1') || 
    resp.includes('mas de 1') ||
    resp.includes('más de un') ||
    resp.includes('mas de un') ||
    resp.includes('1 año') ||
    resp.includes('1 ano') ||
    resp.includes('2 año') ||
    resp.includes('3 año') ||
    resp.includes('> 1') ||
    resp.includes('indefinido') ||
    resp.includes('fijo')
  ) {
    return { suficiente: true, valor: respuesta };
  }
  
  // Verificar se contém número >= 1
  const numMatch = resp.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1) {
      return { suficiente: true, valor: respuesta };
    }
  }
  
  // Por padrão, assumir suficiente se há algum valor
  return { suficiente: true, valor: respuesta };
}

/**
 * Parseia zona de interesse - extrai cidade de texto livre como "Valencia y alrededores"
 */
function parseZonaInteres(respuesta?: string): { zona: string; ciudad?: string; region?: string } {
  if (!respuesta) return { zona: 'General' };
  
  const resp = respuesta.toLowerCase().trim();
  
  // Mapa de cidades conhecidas e suas regiões
  const ciudadesMap: Record<string, string> = {
    'madrid': 'Madrid',
    'barcelona': 'Cataluña',
    'valencia': 'Valencia',
    'sevilla': 'Andalucía',
    'zaragoza': 'Aragón',
    'málaga': 'Andalucía',
    'malaga': 'Andalucía',
    'murcia': 'Murcia',
    'palma': 'Baleares',
    'bilbao': 'País Vasco',
    'alicante': 'Valencia',
    'córdoba': 'Andalucía',
    'cordoba': 'Andalucía',
    'valladolid': 'Castilla y León',
    'vigo': 'Galicia',
    'gijón': 'Asturias',
    'gijon': 'Asturias',
    'granada': 'Andalucía',
    'tarragona': 'Cataluña',
    'girona': 'Cataluña',
    'lleida': 'Cataluña',
    'castellón': 'Valencia',
    'castellon': 'Valencia',
    'toledo': 'Castilla-La Mancha',
    'almería': 'Andalucía',
    'almeria': 'Andalucía',
    'santander': 'Cantabria',
    'pamplona': 'Navarra',
    'san sebastián': 'País Vasco',
    'san sebastian': 'País Vasco',
    'logroño': 'La Rioja',
    'logronyo': 'La Rioja'
  };
  
  for (const [ciudad, region] of Object.entries(ciudadesMap)) {
    if (resp.includes(ciudad)) {
      return { 
        zona: respuesta, 
        ciudad: ciudad.charAt(0).toUpperCase() + ciudad.slice(1),
        region: region
      };
    }
  }
  
  // Retorna o texto original como zona
  return { zona: respuesta };
}

function parseIngresos(rangoIngresos?: string): number {
  if (!rangoIngresos) return 0;
  
  const normalizado = rangoIngresos.toLowerCase().trim();
  
  // Tentar match exato
  if (RANGO_INGRESOS_MAP[normalizado]) {
    return RANGO_INGRESOS_MAP[normalizado];
  }
  
  // Tentar match parcial
  for (const [key, value] of Object.entries(RANGO_INGRESOS_MAP)) {
    if (normalizado.includes(key.replace('€', '').trim())) {
      return value;
    }
  }
  
  // Tentar extrair número diretamente
  const numMatch = rangoIngresos.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  
  return 1500; // Valor padrão
}

function determinarRegion(zonaInteres?: string): string | null {
  if (!zonaInteres) return null;
  
  const zonaNormalizada = zonaInteres.toLowerCase().trim();
  
  for (const [key, comunidad] of Object.entries(CIUDADES_COMUNIDAD_MAP)) {
    if (zonaNormalizada.includes(key)) {
      return comunidad;
    }
  }
  
  // No match found — will trigger fallback in get-next-agent
  return null;
}

function normalizarPreferenciaLlamada(preferencia?: string): string {
  if (!preferencia) return 'mañana';
  
  const pref = preferencia.toLowerCase().trim();
  
  if (pref.includes('mañana') || pref.includes('manana') || pref.includes('morning')) {
    return 'mañana';
  }
  if (pref.includes('tarde') || pref.includes('afternoon')) {
    return 'tarde';
  }
  if (pref.includes('noche') || pref.includes('evening') || pref.includes('night')) {
    return 'noche';
  }
  
  return 'mañana';
}

// CORREÇÃO: Parser de dívidas para converter strings como "148,€" para número
function parseDeudas(deudasInput?: string | number): number {
  if (!deudasInput) return 0;
  
  // Se já é número, retorna direto
  if (typeof deudasInput === 'number') {
    return Math.max(0, deudasInput);
  }
  
  // String: remover símbolos, converter vírgula decimal para ponto
  const cleaned = String(deudasInput)
    .replace(/[€$\s]/g, '')  // Remove símbolos monetários e espaços
    .replace(',', '.');       // Vírgula decimal → ponto
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Parseia idade de múltiplos formatos possíveis do Meta Ads
 * Aceita: edad, age, birth_year, ano_nacimiento, fecha_nacimiento
 */
function parseEdad(data: Record<string, any>): number | null {
  // Lista de campos possíveis para idade
  const possibleFields = ['edad', 'age', 'ano_nacimiento', 'birth_year', 'fecha_nacimiento'];
  
  for (const field of possibleFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') continue;
    
    // Se é número direto
    if (typeof value === 'number') {
      // Se parece ano de nascimento (ex: 1990), calcular idade
      if (value > 1900 && value < new Date().getFullYear() - 10) {
        return new Date().getFullYear() - value;
      }
      // Se parece idade direta (0-120)
      if (value > 0 && value < 120) {
        return value;
      }
    }
    
    // Se é string, tentar extrair número
    if (typeof value === 'string') {
      const numMatch = value.match(/(\d{4}|\d{1,3})/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        
        // Se parece ano de nascimento (4 dígitos, ex: 1990)
        if (num > 1900 && num < new Date().getFullYear() - 10) {
          return new Date().getFullYear() - num;
        }
        
        // Se parece idade direta (1-3 dígitos, ex: 35)
        if (num > 0 && num < 120) {
          return num;
        }
      }
    }
  }
  
  return null;
}

function qualificarLead(data: MetaLeadData, ingresos: number, edadParsed?: number | null, montoAhorros?: number): QualificationResult {
  // Usar funções de parsing melhoradas para respostas abertas do Meta Ads
  
  // Critério 1: Antigüedad en trabajo >= 1 año
  const antigüedadResult = parseAntiguedad(data.antiguedad_trabajo);
  if (!antigüedadResult.suficiente) {
    return { cualificado: false, razon_no_cualificado: 'Antigüedad laboral insuficiente (menos de 1 año)' };
  }
  
  // Critério 2: Tiene NIE/DNI
  const dniResult = parseTieneDniNie(data.tiene_nie_dni);
  if (!dniResult.tiene) {
    return { cualificado: false, razon_no_cualificado: 'No tiene NIE/DNI' };
  }
  
  // Critério 3: NO está en fichero de morosidad
  if (data.en_fichero_morosidad) {
    const morosidad = data.en_fichero_morosidad.toLowerCase().trim().replace(/_/g, ' ');
    // Detectar todas as variações de "sim" em ficheiro de morosidade
    if (
      morosidad === 'si' || 
      morosidad === 'sí' || 
      morosidad.includes('si estoy') || 
      morosidad.includes('sí estoy') ||
      morosidad === 'yes' ||
      morosidad.includes('estoy en') ||
      morosidad.includes('fichero') ||
      morosidad.includes('asnef') ||
      morosidad.includes('rai') ||
      morosidad.includes('deudas') ||
      morosidad.includes('moroso') ||
      morosidad.includes('impago')
    ) {
      return { cualificado: false, razon_no_cualificado: 'Está en fichero de morosidad' };
    }
  }
  
  // Critério 4: Edad >= 55
  if (edadParsed && edadParsed >= 55) {
    return { cualificado: false, razon_no_cualificado: 'Edad superior a 54 años' };
  }
  
  // Critério 5: Ingresos >= 1300€
  if (ingresos < 1300) {
    return { cualificado: false, razon_no_cualificado: 'Ingresos insuficientes (menos de 1300€)' };
  }
  
  // Critério 6: Deudas < 30% de ingresos
  const deudas = data.deudas_mensuales || 0;
  const porcentajeDeuda = (deudas / ingresos) * 100;
  if (porcentajeDeuda >= 30) {
    return { cualificado: false, razon_no_cualificado: 'Porcentaje de deuda muy alto (≥30% de ingresos)' };
  }
  
  // Critério 7: Ahorros para impuestos.
  // El candidato se considera cualificado si:
  //   (a) responde afirmativamente ("sí", "si", "yes", "true", "1") en `tiene_ahorros_impuestos`, O
  //   (b) declara un monto numérico > 0 en `monto_ahorros`.
  // La regla dinámica completa (valor inmueble × % ITP CCAA) se aplica en el simulador
  // hipotecario (src/lib/simuladorUtils.ts) cuando el cliente introduce el precio real.
  // Regla endurecida (2025-04): cualifica si responde afirmativamente con "si/sí/yes"
  // O si declara monto_ahorros >= 5.000€. Caso contrario, descualificado.
  const AHORROS_MINIMO = 5000;
  const respuestaAhorros = (data.tiene_ahorros_impuestos || '').toString().trim().toLowerCase();
  const respuestasAfirmativas = ['si', 'sí', 'yes'];
  const tieneRespuestaAfirmativa = respuestasAfirmativas.includes(respuestaAhorros);
  const tieneMontoSuficiente = (montoAhorros ?? 0) >= AHORROS_MINIMO;

  console.log('[meta-lead-webhook] Validação ahorros:', {
    respuestaAhorros,
    tieneRespuestaAfirmativa,
    montoAhorros,
    tieneMontoSuficiente,
    AHORROS_MINIMO,
  });

  if (!tieneRespuestaAfirmativa && !tieneMontoSuficiente) {
    return {
      cualificado: false,
      razon_no_cualificado: `Ahorros insuficientes (mínimo ${AHORROS_MINIMO}€ o respuesta afirmativa "sí")`,
    };
  }

  return { cualificado: true };
}

// ============================================================================
// SIMULACIONES — Alineadas con src/lib/simuladorUtils.ts (2025)
// ============================================================================

// Tope duro de crédito personal para todos los leads
const CP_TOPE = 15000;
const CP_TAE = 0.08;
const CP_PLAZO_MESES = 84;

// Tabla ITP por CCAA (espejo de src/lib/impuestosCCAA.ts)
const ITP_POR_CCAA: Record<string, number> = {
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
  'Madrid': 0.06,
  'Comunidad Valenciana': 0.10,
  'Valencia': 0.10,
  'Extremadura': 0.08,
  'Galicia': 0.09,
  'La Rioja': 0.07,
  'Melilla': 0.06,
  'Región de Murcia': 0.08,
  'Murcia': 0.08,
  'Navarra': 0.06,
  'País Vasco': 0.04,
};
const ITP_FALLBACK = 0.08;

function getITPPorCCAA(comunidad?: string | null): number {
  if (!comunidad) return ITP_FALLBACK;
  return ITP_POR_CCAA[comunidad] ?? ITP_FALLBACK;
}

/**
 * Crédito personal con tope duro de 15.000€ para todos.
 */
function calcularSimulacionPersonal(ingresos: number, deudas: number) {
  const capacidadPago = ingresos * 0.35;
  const capacidadDisponible = Math.max(capacidadPago - deudas, 0);

  const r = CP_TAE / 12;
  const n = CP_PLAZO_MESES;
  const factorAnualidad = (1 - Math.pow(1 + r, -n)) / r;

  const montoTeorico = Math.round(capacidadDisponible * factorAnualidad);
  // Tope duro 15.000€ — defensivo, nunca puede salir un valor superior
  const montoMaximo = Math.min(Math.max(montoTeorico, 0), CP_TOPE);
  console.log('[CP] capacidad:', Math.round(capacidadDisponible), '€/mes · teórico:', montoTeorico, '€ → aplicado tope', CP_TOPE, '€ → final:', montoMaximo, '€');

  const cuotaMensual = montoMaximo > 0
    ? Math.round((montoMaximo * r) / (1 - Math.pow(1 + r, -n)))
    : 0;

  const cuotaTope = Math.round((CP_TOPE * r) / (1 - Math.pow(1 + r, -n))); // ≈ 234€

  return {
    monto_maximo: montoMaximo,
    cuota_mensual: cuotaMensual,
    cuota_tope_15k: cuotaTope,
    plazo_meses: n,
    tae_estimada: 8,
    capacidad_disponible_mensual: Math.round(capacidadDisponible),
    aprobado: capacidadDisponible >= cuotaTope && montoMaximo > 0,
  };
}

/**
 * Hipoteca máxima alineada con el simulador del front.
 */
function calcularSimulacionHipotecaria(ingresos: number, deudas: number, edad?: number) {
  const PCT_FINANCIACION = 0.90;
  const CAP_MONTO_1_TITULAR = 180000;
  const MIN_MONTO = 70000;
  const MIN_CAPACIDAD_MES = 350;

  const capacidadPago = (ingresos - deudas) * 0.35;
  const cuotaMaxima = Math.max(capacidadPago, 0);

  const edadActual = edad || 35;
  const plazoMaximoAnos = Math.max(Math.min(30, 75 - edadActual), 1);
  const plazoMeses = plazoMaximoAnos * 12;

  const r = 0.025 / 12;
  const n = plazoMeses;

  const factor = (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  const montoTeorico = Math.round(cuotaMaxima * factor);
  const montoMaximoFinanciable = Math.min(montoTeorico, CAP_MONTO_1_TITULAR);

  const cuotaMensualReal = montoMaximoFinanciable > 0
    ? Math.round((montoMaximoFinanciable * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : 0;

  const valorMaximoInmueble = Math.round(montoMaximoFinanciable / PCT_FINANCIACION);
  const capitalNecesario = Math.round(valorMaximoInmueble * (1 - PCT_FINANCIACION) + valorMaximoInmueble * 0.10);

  const aprobable =
    montoMaximoFinanciable >= MIN_MONTO &&
    cuotaMaxima >= MIN_CAPACIDAD_MES;

  return {
    monto_maximo_financiable: montoMaximoFinanciable,
    valor_maximo_inmueble: valorMaximoInmueble,
    cuota_maxima_mensual: Math.round(cuotaMaxima),
    cuota_mensual_real: cuotaMensualReal,
    capital_necesario: capitalNecesario,
    plazo_anos: plazoMaximoAnos,
    tae_estimada: 2.5,
    porcentaje_financiacion: PCT_FINANCIACION * 100,
    aprobado: aprobable,
  };
}

/**
 * Precio Máximo de Inmueble Recomendado = MIN(P1, P2).
 */
function calcularPrecioMaximoInmuebleMeta(params: {
  ahorros: number;
  comunidad?: string | null;
  monto_max_financiable: number;
  pct_financiacion: number;
}) {
  const ahorros = Math.max(params.ahorros || 0, 0);
  const tasaITP = getITPPorCCAA(params.comunidad);
  const cpMax = (CP_TOPE + ahorros) / 2;
  const precioMaxP1 = tasaITP > 0 ? Math.round(cpMax / tasaITP) : 0;

  const pct = (params.pct_financiacion || 90) / 100;
  const precioMaxP2 = pct > 0 ? Math.round((params.monto_max_financiable || 0) / pct) : 0;

  const candidatos = [precioMaxP1, precioMaxP2].filter(v => v > 0);
  const precioMaxRecomendado = candidatos.length > 0 ? Math.min(...candidatos) : 0;

  return {
    precio_max_p1: precioMaxP1,
    precio_max_p2: precioMaxP2,
    precio_max_recomendado: precioMaxRecomendado,
    cp_max: Math.round(cpMax),
    tasa_itp_aplicada: tasaITP,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body com sanitização para lidar com caracteres inválidos do Facebook Ads
    let data: MetaLeadData;
    
    try {
      // Tentar parse direto
      data = await req.json();
    } catch (parseError) {
      // Se falhar, provavelmente há caracteres de controle inválidos no JSON
      console.log('[meta-lead-webhook] JSON parse falhou, tentando sanitizar...', parseError);
      
      // Precisamos clonar o request para ler o body novamente
      const rawBody = await req.clone().text();
      console.log('[meta-lead-webhook] Body raw (primeiros 500 chars):', rawBody.substring(0, 500));
      
      const sanitizedBody = sanitizeJsonString(rawBody);
      
      try {
        data = JSON.parse(sanitizedBody);
        console.log('[meta-lead-webhook] Body sanitizado com sucesso');
      } catch (sanitizeError) {
        console.error('[meta-lead-webhook] Falha mesmo após sanitização:', sanitizeError);
        console.error('[meta-lead-webhook] Body original completo:', rawBody);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'JSON inválido no body da requisição',
            hint: 'Verifique se há caracteres especiais (quebras de linha, tabs) nos campos do formulário do Facebook',
            details: parseError.message || 'Erro de parse'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Sanitizar todos os campos de texto individualmente para garantir limpeza
    data.nombre = sanitizeField(data.nombre) as string;
    data.telefono = sanitizeField(data.telefono) as string;
    data.email = sanitizeField(data.email) as string;

    // Auto-corregir typos comunes en el dominio del email (ej.: gmial.com → gmail.com)
    if (data.email) {
      const emailCorr = correctEmail(data.email);
      if (emailCorr.corrected) {
        console.log('[meta-lead-webhook] Email auto-corregido:', emailCorr.original, '→', emailCorr.email, '(' + emailCorr.reason + ')');
        data.email = emailCorr.email;
      }
    }
    data.zona_interes = sanitizeField(data.zona_interes) as string | undefined;
    data.antiguedad_trabajo = sanitizeField(data.antiguedad_trabajo) as string | undefined;
    data.tiene_nie_dni = sanitizeField(data.tiene_nie_dni) as string | undefined;
    data.en_fichero_morosidad = sanitizeField(data.en_fichero_morosidad) as string | undefined;
    data.preferencia_llamada = sanitizeField(data.preferencia_llamada) as string | undefined;
    data.rango_ingresos = sanitizeField(data.rango_ingresos) as string | undefined;
    // Novos campos Meta Ads
    data.tiene_ahorros_impuestos = sanitizeField(data.tiene_ahorros_impuestos) as string | undefined;
    data.monto_ahorros = sanitizeField(data.monto_ahorros) as string | number | undefined;
    data.tiene_vivienda_seleccionada = sanitizeField(data.tiene_vivienda_seleccionada) as string | undefined;
    
    console.log('[meta-lead-webhook] Dados recebidos (sanitizados):', JSON.stringify(data));
    
    // LOG DIAGNÓSTICO: Mostrar todos os campos recebidos para debug
    console.log('[meta-lead-webhook] Campos recebidos do payload:', Object.keys(data).join(', '));
    console.log('[meta-lead-webhook] Campo edad raw:', data.edad, '| age:', data.age, '| birth_year:', data.birth_year);

    // Validar campos obrigatórios
    if (!data.nombre || !data.telefono || !data.email) {
      console.error('[meta-lead-webhook] Campos obrigatórios faltando');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios faltando: nombre, telefono, email' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Parsear ingresos e dívidas (CORREÇÃO: usa parseDeudas para converter "148,€" → 148)
    const ingresos = parseIngresos(data.rango_ingresos);
    const deudas = parseDeudas(data.deudas_mensuales);
    
    console.log('[meta-lead-webhook] Ingresos parseados:', ingresos, 'Deudas parseadas:', deudas);

    // 2. Parsear edad ANTES da qualificação (para que o check >= 66 funcione com strings)
    const edadParsed = parseEdad(data);
    console.log('[meta-lead-webhook] Edad parseada:', edadParsed);

    // 2.1 Parsear monto de ahorros (usado tanto na qualificação quanto nas recomendações)
    const montoAhorros = parseDeudas(data.monto_ahorros);
    console.log('[meta-lead-webhook] Monto ahorros parseado:', montoAhorros);

    // 3. Qualificar lead (passa edad parseada e ahorros)
    const qualificacao = qualificarLead(data, ingresos, edadParsed, montoAhorros);
    console.log('[meta-lead-webhook] Qualificação:', qualificacao);

    // 3. Determinar região e turno
    const region = determinarRegion(data.zona_interes);
    const turnoPreferido = normalizarPreferenciaLlamada(data.preferencia_llamada);
    
    console.log('[meta-lead-webhook] Região:', region, 'Turno:', turnoPreferido);

    // 4. Atribuir agente via round-robin
    let agenteAsignado = null;
    
    if (qualificacao.cualificado) {
      try {
        const { data: agenteData, error: agenteError } = await supabase.functions.invoke('get-next-agent', {
          body: { 
            region: region,
            considerarTurno: true,
            turnoOverride: turnoPreferido
          }
        });
        
        if (agenteError) {
          console.error('[meta-lead-webhook] Erro ao buscar agente:', agenteError);
        } else if (agenteData?.agente) {
          agenteAsignado = agenteData.agente;
          console.log('[meta-lead-webhook] Agente asignado:', agenteAsignado.nombre);
        }
      } catch (err) {
        console.error('[meta-lead-webhook] Exceção ao buscar agente:', err);
      }

      // FALLBACK DIRETO: Se get-next-agent falhou, buscar agente diretamente
      if (!agenteAsignado) {
        console.warn('[meta-lead-webhook] get-next-agent falhou, usando fallback direto');
        try {
          const { data: fallbackAgents } = await supabase
            .from('profiles')
            .select('id, nombre, email, telefono, tidycal_url, region_round_robin')
            .eq('activo', true)
            .not('region_round_robin', 'is', null)
            .order('nombre');

          if (fallbackAgents && fallbackAgents.length > 0) {
            // Sort by number of regions (most coverage first)
            const sorted = fallbackAgents
              .filter(a => Array.isArray(a.region_round_robin) && a.region_round_robin.length > 0)
              .sort((a, b) => (b.region_round_robin?.length || 0) - (a.region_round_robin?.length || 0));

            const chosen = sorted[0] || fallbackAgents[0];
            agenteAsignado = {
              id: chosen.id,
              nombre: chosen.nombre,
              email: chosen.email,
              telefono: chosen.telefono,
              tidycal_url: chosen.tidycal_url
            };
            console.log('[meta-lead-webhook] Fallback direto asignado:', agenteAsignado.nombre);
          }
        } catch (fbErr) {
          console.error('[meta-lead-webhook] Fallback direto também falhou:', fbErr);
        }
      }
    }

    // 7. Calcular simulações (edadParsed e montoAhorros já calculados acima)

    // Parsear zona aqui para usar a CCAA detectada também no Precio Máximo (P1)
    const zonaParseada = parseZonaInteres(data.zona_interes);
    console.log('[meta-lead-webhook] Zona parseada:', zonaParseada);

    const simulacionHipotecaria = calcularSimulacionHipotecaria(ingresos, deudas, edadParsed || undefined);
    const simulacionPersonal = calcularSimulacionPersonal(ingresos, deudas);

    // Precio Máximo de Inmueble Recomendado (Punto 1 + Punto 2)
    const precioMaxInmueble = calcularPrecioMaximoInmuebleMeta({
      ahorros: montoAhorros,
      comunidad: region, // CCAA detectada via determinarRegion
      monto_max_financiable: simulacionHipotecaria.monto_maximo_financiable || 0,
      pct_financiacion: simulacionHipotecaria.porcentaje_financiacion || 90,
    });

    // Plan combinado simplificado (sin fases — el CP es siempre 15k)
    const cuotaHipoteca = simulacionHipotecaria.cuota_mensual_real || 0;
    const cuotaPersonal = simulacionPersonal.cuota_mensual || 0;
    const planPagos = {
      pago_combinado_mensual_aprox: cuotaHipoteca + cuotaPersonal,
      cuota_hipoteca_mensual: cuotaHipoteca,
      cuota_personal_mensual: cuotaPersonal,
      poder_compra_total: montoAhorros + (simulacionPersonal.monto_maximo || 0),
      ahorros_cliente: montoAhorros,
      credito_personal_aprobado: simulacionPersonal.monto_maximo || 0,
    };

    console.log('[meta-lead-webhook] Simulación personal:', simulacionPersonal);
    console.log('[meta-lead-webhook] Simulación hipotecaria:', simulacionHipotecaria);
    console.log('[meta-lead-webhook] Precio máximo inmueble:', precioMaxInmueble);
    console.log('[meta-lead-webhook] Plan combinado:', planPagos);

    // 6. Buscar recomendações de imóveis (zonaParseada já calculado arriba)
    let recomendaciones: any[] = [];
    
    if (qualificacao.cualificado) {
      try {
        // CORREÇÃO: Validar se valor_maximo_inmueble é válido (não NaN)
        const valorMaxInm = simulacionHipotecaria.valor_maximo_inmueble;
        const precioMaximo = !isNaN(valorMaxInm) && valorMaxInm > 0 
          ? Math.round(valorMaxInm * 1.35)  // 135% do valor máximo
          : null;  // Sem limite se simulação falhou
        
        console.log('[meta-lead-webhook] Precio máximo para busca:', precioMaximo);
        
        let query = supabase
          .from('inmuebles')
          .select('id, titulo, precio, quartos, ciudad, region, direccion, image_url, url_externa')
          .eq('disponible', true);
        
        // CORREÇÃO: Aplicar filtro de preço apenas se válido
        if (precioMaximo) {
          query = query.lte('precio', precioMaximo);
        }
        
        // CORREÇÃO: Usar cidade EXTRAÍDA do parseZonaInteres (ex: "Valencia")
        // em vez do texto livre (ex: "Valencia, preferiblemente un pueblo cercano")
        // Isso evita que vírgulas quebrem o parser SQL do Supabase
        const ciudadBuscar = zonaParseada.ciudad;
        const regionBuscar = zonaParseada.region;
        
        if (ciudadBuscar) {
          // Busca segura: apenas nome da cidade, sem vírgulas ou texto adicional
          query = query.or(
            `ciudad.ilike.%${ciudadBuscar}%,region.ilike.%${ciudadBuscar}%`
          );
          console.log('[meta-lead-webhook] Buscando por cidade:', ciudadBuscar);
        } else if (regionBuscar) {
          query = query.or(
            `ciudad.ilike.%${regionBuscar}%,region.ilike.%${regionBuscar}%`
          );
          console.log('[meta-lead-webhook] Buscando por região:', regionBuscar);
        } else {
          console.log('[meta-lead-webhook] Sem filtro de localização, busca geral');
        }
        
        // Filtrar por habitaciones se especificado
        if (data.habitaciones) {
          query = query.gte('quartos', data.habitaciones);
        }
        
        const { data: inmuebles, error: inmError } = await query
          .order('precio', { ascending: true })
          .limit(5);
        
        if (inmError) {
          console.error('[meta-lead-webhook] Erro ao buscar imóveis:', inmError);
        } else {
          recomendaciones = inmuebles || [];
          console.log('[meta-lead-webhook] Recomendaciones encontradas:', recomendaciones.length);
        }
      } catch (err) {
        console.error('[meta-lead-webhook] Exceção ao buscar imóveis:', err);
      }
    }

    // 7. Salvar lead no banco
    let leadId = null;
    
    // zonaParseada já foi definido antes (na busca de imóveis)
    
    // Market price validation
    const ciudadParaValidar = zonaParseada.ciudad || data.zona_interes;
    const marketValidation = ciudadParaValidar ? validateBudget(
      simulacionHipotecaria.valor_maximo_inmueble || 0,
      ciudadParaValidar
    ) : null;
    const marketInfo = ciudadParaValidar ? getProvinceMarketPrice(ciudadParaValidar) : null;

    // Montar notas com informações de qualificação
    const notasLead = [
      `Lead do Meta Ads.`,
      `Qualificação automática: ${qualificacao.cualificado ? 'CUALIFICADO' : 'NO CUALIFICADO - ' + qualificacao.razon_no_cualificado}`,
      `Edad: ${edadParsed || 'não informada'}`,
      `Preferência de chamada: ${data.preferencia_llamada || 'não especificada'}`,
      `Habitaciones: ${data.habitaciones || 'não especificada'}`,
      `Antigüedad: ${data.antiguedad_trabajo || 'não especificada'}`,
      `DNI/NIE: ${data.tiene_nie_dni || 'não especificada'}`,
      `Zona: ${data.zona_interes || 'não especificada'}`,
      zonaParseada.ciudad ? `Ciudad detectada: ${zonaParseada.ciudad}` : null,
      `Ahorros para impuestos: ${data.tiene_ahorros_impuestos || 'não especificado'} - ${data.monto_ahorros || '0'}€`,
      `Vivienda seleccionada: ${data.tiene_vivienda_seleccionada || 'não especificado'}`,
      (cuotaHipoteca > 0 || cuotaPersonal > 0)
        ? `Plan combinado: ${Math.round(planPagos.pago_combinado_mensual_aprox)}€/mes (hip: ${Math.round(cuotaHipoteca)}€ + cp 15k: ${Math.round(cuotaPersonal)}€)`
        : null,
      precioMaxInmueble.precio_max_recomendado > 0
        ? `Precio máx. inmueble recomendado: ${precioMaxInmueble.precio_max_recomendado.toLocaleString('es-ES')}€ (P1 ahorros: ${precioMaxInmueble.precio_max_p1.toLocaleString('es-ES')}€ · P2 ingresos: ${precioMaxInmueble.precio_max_p2.toLocaleString('es-ES')}€)`
        : null,
      marketValidation ? `Mercado: ${marketValidation.mensaje}` : null,
      marketInfo ? `Precio medio zona: ${marketInfo.precioMedio.toLocaleString('es-ES')}€ (${marketInfo.precioM2.toLocaleString('es-ES')}€/m²)` : null,
    ].filter(Boolean).join('\n');
    
    // Enriquecer JSONs de simulação com inputs raw + extras (para reenvio fiel pelo proxy)
    const simulacionPersonalEnriched = {
      ...simulacionPersonal,
      // Reforço defensivo do tope 15k antes de salvar
      monto_maximo: Math.min(simulacionPersonal.monto_maximo || 0, CP_TOPE),
      ingresos,
      deudas,
    };

    const simulacionHipotecariaEnriched = {
      ...simulacionHipotecaria,
      ingresos,
      deudas,
      // Campos novos calculados (Punto 1 + Punto 2) — necessários para o teste/manual
      precio_maximo_inmueble: precioMaxInmueble.precio_max_recomendado,
      precio_max_por_ahorros: precioMaxInmueble.precio_max_p1,
      precio_max_por_ingresos: precioMaxInmueble.precio_max_p2,
      credito_personal_maximo: precioMaxInmueble.cp_max,
      tasa_itp_aplicada: precioMaxInmueble.tasa_itp_aplicada,
      // Snapshot dos inputs Meta usados para reconstrução
      meta_monto_ahorros: montoAhorros,
      meta_tiene_ahorros: data.tiene_ahorros_impuestos || null,
      meta_vivienda_seleccionada: data.tiene_vivienda_seleccionada || null,
      meta_antiguedad_trabajo: data.antiguedad_trabajo || null,
      meta_dni_nie: data.tiene_nie_dni || null,
      meta_preferencia_llamada: data.preferencia_llamada || null,
      meta_habitaciones: data.habitaciones || null,
    };

    try {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert({
          nombre_completo: data.nombre,
          telefono: data.telefono,
          email: data.email,
          ciudad_interes: zonaParseada.ciudad || data.zona_interes || null,
          zona_interes: data.zona_interes || null,
          valor_inmueble_deseado: null, // Será preenchido quando um imóvel for vinculado
        agente_asignado_id: agenteAsignado?.id || null,
        // Leads não qualificados vão direto para 'descualificados'
        stage: qualificacao.cualificado ? 'nuevo_lead' : 'descualificados',
        source: 'meta_ads',
          notas: notasLead,
          simulador_personal_data: simulacionPersonalEnriched,
          simulador_hipotecario_data: simulacionHipotecariaEnriched
        })
        .select('id')
        .single();
      
      if (leadError) {
        console.error('[meta-lead-webhook] Erro ao criar lead:', leadError);
      } else {
        leadId = leadData.id;
        console.log('[meta-lead-webhook] Lead criado com stage:', qualificacao.cualificado ? 'nuevo_lead' : 'descualificados', leadId);
      }
    } catch (err) {
      console.error('[meta-lead-webhook] Exceção ao criar lead:', err);
    }

    // 7.5. DISPARO AUTOMÁTICO: Se lead foi descualificado, disparar webhook de descualificação
    if (!qualificacao.cualificado && leadId) {
      try {
        // Buscar URL do webhook de descualificados
        const { data: disqualifiedSetting } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'webhook_disqualified_url')
          .single();

        const disqualifiedWebhookUrl = disqualifiedSetting?.value;

        if (disqualifiedWebhookUrl && disqualifiedWebhookUrl.trim() !== '') {
          console.log('[meta-lead-webhook] Disparando webhook de descualificação automaticamente');

          const disqualifiedPayload = {
            source: 'disqualified_lead_auto',
            timestamp: new Date().toISOString(),
            lead_id: leadId,
            lead_nombre: data.nombre,
            lead_email: data.email,
            lead_telefono: data.telefono,
            lead_zona_interes: data.zona_interes || null,
            lead_ciudad_interes: zonaParseada.ciudad || null,
            razon_descualificacion: qualificacao.razon_no_cualificado || 'Não qualificado',
            agente_nombre: agenteAsignado?.nombre || null,
            agente_email: agenteAsignado?.email || null,
            test_mode: false
          };

          const disqualifiedResponse = await fetch(disqualifiedWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(disqualifiedPayload)
          });

          // Registrar log
          await supabase.from('webhook_logs').insert({
            webhook_url: disqualifiedWebhookUrl + ' (disqualified_auto)',
            status: disqualifiedResponse.ok ? 'success' : 'error',
            error_message: !disqualifiedResponse.ok 
              ? `HTTP ${disqualifiedResponse.status}: ${disqualifiedResponse.statusText}` 
              : null,
            payload: disqualifiedPayload
          });

          console.log('[meta-lead-webhook] Webhook descualificação automática:', 
            disqualifiedResponse.ok ? 'success' : 'error');
        } else {
          console.log('[meta-lead-webhook] URL do webhook de descualificação não configurada');
        }
      } catch (disErr) {
        console.error('[meta-lead-webhook] Erro ao disparar webhook de descualificação:', disErr);
        
        // Registrar erro no log
        await supabase.from('webhook_logs').insert({
          webhook_url: 'webhook_disqualified_url (auto_error)',
          status: 'error',
          error_message: disErr.message || 'Erro desconhecido'
        });
      }
    }

    // 8. Montar resposta completa para o Make.com
    const response = {
      success: true,
      lead_id: leadId,
      cualificado: qualificacao.cualificado,
      razon_no_cualificado: qualificacao.razon_no_cualificado || null,
      
      lead: {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        edad: edadParsed || null,
        zona_interes: data.zona_interes || null,
        habitaciones: data.habitaciones || null,
        ingresos_estimados: ingresos,
        deudas_mensuales: deudas,
        preferencia_llamada: data.preferencia_llamada || null
      },
      
      agente: agenteAsignado ? {
        id: agenteAsignado.id,
        nombre: agenteAsignado.nombre,
        email: agenteAsignado.email,
        telefono: agenteAsignado.telefono || null,
        tidycal_url: agenteAsignado.tidycal_url || null
      } : null,
      
      simulacion_personal: simulacionPersonal,
      simulacion_hipotecaria: simulacionHipotecaria,
      
      recomendaciones: recomendaciones.map(inm => ({
        id: inm.id,
        titulo: inm.titulo || `${inm.quartos || '?'} hab en ${inm.ciudad}`,
        precio: inm.precio,
        habitaciones: inm.quartos,
        ciudad: inm.ciudad,
        // URL do inventário Vercel (NUNCA link do CRM aqui)
        url: `https://inventariotuhogarposible.vercel.app/produto/${inm.id}`,
        url_externa: inm.url_externa,
        image_url: inm.image_url
      })),
      
      // URL do CRM para gestão do lead (NÃO É RECOMENDAÇÃO DE IMÓVEL)
      crm_url: leadId 
        ? `https://tu-hogar-vista.lovable.app/agente/crm?lead=${leadId}`
        : null,
      
      metadata: {
        region_detectada: region,
        turno_preferido: turnoPreferido,
        processed_at: new Date().toISOString()
      }
    };

    // 9. Disparar webhook para Bitrix24 via Make.com (se lead qualificado)
    if (qualificacao.cualificado && leadId) {
      try {
        // Buscar URL do webhook Meta Bitrix
        const { data: webhookSetting } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'webhook_meta_bitrix_url')
          .single();

        const webhookUrl = webhookSetting?.value;

        if (webhookUrl && webhookUrl.trim() !== '') {
          console.log('[meta-lead-webhook] Disparando webhook para Bitrix24:', webhookUrl);

          // Construir lead-shape para o builder compartilhado (usa o lead recém-salvo + JSONs enriquecidos)
          const leadShape = {
            id: leadId,
            nombre_completo: data.nombre,
            telefono: data.telefono,
            email: data.email,
            ciudad_interes: zonaParseada.ciudad || data.zona_interes || null,
            zona_interes: data.zona_interes || null,
            valor_inmueble_deseado: null,
            stage: 'nuevo_lead',
            notas: notasLead,
            simulador_personal_data: simulacionPersonalEnriched,
            simulador_hipotecario_data: simulacionHipotecariaEnriched,
          };

          // Build payload Bitrix usando a fonte ÚNICA compartilhada
          const bitrixPayload: Record<string, any> = buildBitrixPayloadFromLead({
            lead: leadShape,
            agente: agenteAsignado,
            recomendaciones,
            source: 'meta_ads',
            extra: {
              // Mercado (extras opcionais para o Make)
              mercado_precio_medio: marketInfo?.precioMedio || null,
              mercado_precio_m2: marketInfo?.precioM2 || null,
              mercado_presupuesto_realista: marketValidation?.realista ?? null,
              mercado_mensaje: marketValidation?.mensaje || null,
              // Plan combinado (informativo)
              pago_combinado_mensual_aprox: planPagos.pago_combinado_mensual_aprox,
              poder_compra_total: planPagos.poder_compra_total,
            },
          });
          // Override edad com valor parseado (mais confiável que regex em notas)
          bitrixPayload.lead_edad = edadParsed || bitrixPayload.lead_edad || '';

          // Disparar webhook (mantém JSON, Make.com aceita ambos formatos)
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bitrixPayload)
          });

          // Registrar log
          const logStatus = webhookResponse.ok ? 'success' : 'error';
          const errorMessage = !webhookResponse.ok 
            ? `HTTP ${webhookResponse.status}: ${webhookResponse.statusText}` 
            : null;

          await supabase.from('webhook_logs').insert({
            webhook_url: webhookUrl + ' (meta_bitrix)',
            status: logStatus,
            error_message: errorMessage,
            payload: bitrixPayload
          });

          console.log('[meta-lead-webhook] Webhook Bitrix24 disparado:', logStatus);
        } else {
          console.log('[meta-lead-webhook] URL do webhook Bitrix24 não configurada');
        }
      } catch (webhookErr) {
        console.error('[meta-lead-webhook] Erro ao disparar webhook Bitrix24:', webhookErr);
        
        // Registrar erro no log
        await supabase.from('webhook_logs').insert({
          webhook_url: 'webhook_meta_bitrix_url (error)',
          status: 'error',
          error_message: webhookErr.message || 'Erro desconhecido'
        });
      }
    }

    console.log('[meta-lead-webhook] Resposta final:', JSON.stringify(response));

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[meta-lead-webhook] Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
