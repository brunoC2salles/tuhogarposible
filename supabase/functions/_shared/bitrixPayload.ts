// ============================================================================
// SHARED — Builder único do payload Bitrix (Meta Ads → Make.com)
// Usado por: meta-lead-webhook (envio real) e make-webhook-proxy (teste/manual).
// MANTÉM EXATAMENTE os nomes de variáveis que o template Bitrix do Make espera.
// ============================================================================

export const CP_TOPE = 15000;
export const CP_TAE = 0.08;
export const CP_PLAZO_MESES = 84;

/**
 * Normaliza o crédito personal de QUALQUER lead (mesmo antigos com 36k salvos).
 * Garante: monto ≤ 15.000€ e cuota recalculada (84m, 8% TAE).
 */
export function normalizarCreditoPersonal(simPersonal: any): { monto: number; cuota: number } {
  const r = CP_TAE / 12;
  const n = CP_PLAZO_MESES;

  const montoBruto = Number(
    simPersonal?.monto_maximo ?? simPersonal?.montoSolicitado ?? simPersonal?.montoMaximoCredito ?? 0
  );
  const monto = Math.min(Math.max(Math.round(montoBruto), 0), CP_TOPE);

  const cuota = monto > 0
    ? Math.round((monto * r) / (1 - Math.pow(1 + r, -n)))
    : 0;

  return { monto, cuota };
}
/**
 * Combina fecha (YYYY-MM-DD) + hora (HH:mm[:ss]) num formato ISO local
 * `YYYY-MM-DDTHH:mm:ss` que o campo "data e hora" do Bitrix aceita nativamente.
 * Sem hora → 00:00:00. Sem fecha → string vazia.
 */
export function buildFechaReunionBitrix(
  fecha: string | null | undefined,
  hora: string | null | undefined
): string {
  if (!fecha) return '';
  const f = String(fecha).trim();
  // Aceita YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss (já ISO)
  const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return '';
  const datePart = dateMatch[1];

  let timePart = '00:00:00';
  if (hora) {
    const h = String(hora).trim();
    const m = h.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const hh = m[1].padStart(2, '0');
      const mm = m[2];
      const ss = m[3] || '00';
      timePart = `${hh}:${mm}:${ss}`;
    }
  }
  return `${datePart}T${timePart}`;
}


/** Extrai um campo "Chave: valor" das notas do lead. */
export function extractFromNotes(notas: string | null | undefined, key: string): string {
  if (!notas) return '';
  const regex = new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, 'i');
  const match = notas.match(regex);
  return match ? match[1].trim() : '';
}

/** Extrai apenas o número de uma string como "Sí - 12000€". */
function extractNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const m = String(value).match(/(\d[\d.]*)/);
  return m ? Number(m[1].replace(/\./g, '')) : 0;
}

function normalizeAhorrosResponse(value: any): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function isAffirmativeAhorrosResponse(value: any): boolean {
  const normalized = normalizeAhorrosResponse(value);
  if (!normalized) return false;
  if (/\b(no|sin|ningun|ninguna|nada|0)\b/.test(normalized)) return false;
  return /\b(si|yes|tengo|dispongo|cuento|claro|afirmativo)\b/.test(normalized);
}

export interface BitrixPayloadInput {
  lead: any;            // row da tabela leads (com simulador_personal_data e simulador_hipotecario_data)
  agente?: any | null;  // profile do agente
  recomendaciones?: any[];
  beworLink?: string;
  source: string;       // 'meta_ads' | 'test_meta_bitrix' | 'manual_assignment' | etc.
  extra?: Record<string, any>;
}

/**
 * Builder ÚNICO do payload Bitrix.
 * Saída: campos planos com EXATAMENTE os nomes do template Bitrix do Make.
 */
export function buildBitrixPayloadFromLead(input: BitrixPayloadInput): Record<string, any> {
  const { lead, agente, recomendaciones = [], beworLink = '', source, extra = {} } = input;

  const simPersonal = (lead.simulador_personal_data as any) || {};
  const simHipoteca = (lead.simulador_hipotecario_data as any) || {};

  // Crédito personal: SEMPRE normalizado (15k duro + cuota recalculada)
  const cp = normalizarCreditoPersonal(simPersonal);

  // Ingresos / deudas: priorizar JSON enriquecido; fallback notas
  const ingresos = Number(simHipoteca.ingresos ?? simPersonal.ingresos ?? 0);
  const deudas = Number(simHipoteca.deudas ?? simPersonal.deudas ?? 0);

  // Hipoteca: cuota REAL + valor max = precio recomendado MIN(P1,P2)
  const hipotecaCuotaReal =
    simHipoteca.cuota_mensual_real ?? simHipoteca.cuota_maxima_mensual ?? simHipoteca.cuotaMensual ?? 0;
  const hipotecaValorMaxInmueble =
    simHipoteca.precio_maximo_inmueble ??
    simHipoteca.valor_maximo_inmueble ??
    simHipoteca.valorMaximoInmueble ??
    0;
  // REGRA (2026-05): monto_financiable = precio_maximo_inmueble (mesmo valor).
  // O cap absoluto por titular (180k/210k) deixou de ser enviado ao Bitrix.
  const hipotecaMontoFinanciableRaw =
    simHipoteca.monto_maximo_financiable ?? simHipoteca.montoFinanciable ?? 0;
  const hipotecaMontoFinanciable =
    Number(hipotecaValorMaxInmueble) > 0 ? Number(hipotecaValorMaxInmueble) : Number(hipotecaMontoFinanciableRaw);

  // Campos Meta — priorizar JSON enriquecido; fallback notas (leads antigos)
  const metaMontoAhorros = Number(
    simHipoteca.meta_monto_ahorros ??
    extractNumber(extractFromNotes(lead.notas, 'Ahorros para impuestos')) ??
    0
  );
  const metaTieneAhorros =
    simHipoteca.meta_tiene_ahorros ??
    (extractFromNotes(lead.notas, 'Ahorros para impuestos').split(' - ')[0] || '');
  const metaTieneAhorrosBitrix = isAffirmativeAhorrosResponse(metaTieneAhorros) ? 'sí' : metaTieneAhorros;
  const metaViviendaSel =
    simHipoteca.meta_vivienda_seleccionada ??
    extractFromNotes(lead.notas, 'Vivienda seleccionada') ??
    '';
  const metaAntiguedad =
    simHipoteca.meta_antiguedad_trabajo ??
    extractFromNotes(lead.notas, 'Antigüedad') ??
    '';
  const metaDniNie =
    simHipoteca.meta_dni_nie ??
    extractFromNotes(lead.notas, 'DNI/NIE') ??
    '';
  const metaPreferencia =
    simHipoteca.meta_preferencia_llamada ??
    extractFromNotes(lead.notas, 'Preferência de chamada') ??
    extractFromNotes(lead.notas, 'Preferencia de llamada') ??
    '';
  const metaHabitaciones =
    simHipoteca.meta_habitaciones ??
    extractFromNotes(lead.notas, 'Habitaciones') ??
    '';

  const recom = recomendaciones.slice(0, 3);

  const payload: Record<string, any> = {
    source,
    timestamp: new Date().toISOString(),
    lead_id: lead.id,
    cualificado:
      lead.stage !== 'descualificados' && lead.stage !== 'no_cualificado' ? 'true' : 'false',

    // ===== Lead (formato exato do template Bitrix) =====
    lead_nombre: lead.nombre_completo,
    lead_telefono: lead.telefono,
    lead_email: lead.email,
    lead_edad: extractFromNotes(lead.notas, 'Edad') || '',
    lead_zona_interes: lead.zona_interes || '',
    lead_ciudad_interes: lead.ciudad_interes || '',
    lead_valor_deseado: lead.valor_inmueble_deseado || 0,
    lead_ingresos_mensuales: ingresos,
    lead_habitaciones: metaHabitaciones,
    lead_numero_de_viviendas: metaHabitaciones,
    lead_preferencia_llamada: metaPreferencia,
    lead_disponibilidad: metaPreferencia,
    lead_documento: metaDniNie,

    // ===== Agendamento de reunião (vem do formulário Meta Ads) =====
    lead_fecha_reunion: lead.fecha_reunion || '',
    lead_hora_reunion: lead.hora_reunion || '',
    lead_hora_reunion_texto: lead.hora_reunion_texto || '',
    lead_zona_horaria_reunion: lead.zona_horaria_reunion || 'Europe/Madrid',
    lead_reunion_datetime: lead.reunion_datetime || '',
    // Pré-formatado para o campo data+hora do Bitrix (YYYY-MM-DDTHH:mm:ss).
    // Evita parseDate/formatDate no Make: basta mapear este campo diretamente.
    lead_fecha_reunion_bitrix: buildFechaReunionBitrix(lead.fecha_reunion, lead.hora_reunion),
    // Confiança do parser: 'high' (dia+hora explícitos), 'medium' (só um), 'low' (default)
    lead_reunion_confidence: lead.reunion_confidence || '',

    // ===== Meta (mantém nomes do template) =====
    meta_dni_nie: metaDniNie,
    meta_antiguedad_trabajo: metaAntiguedad,
    meta_deudas_mensuales: deudas,
    meta_monto_ahorros: metaMontoAhorros,
    meta_tiene_ahorros: metaTieneAhorrosBitrix,
    meta_vivienda_seleccionada: metaViviendaSel,

    // ===== Agente =====
    agente_id: agente?.id || '',
    agente_nombre: agente?.nombre || 'Sin asignar',
    agente_email: agente?.email || '',
    agente_telefono: agente?.telefono || '',

    // ===== Crédito Personal (SEMPRE 15k máx, cuota recalculada) =====
    sim_personal_monto_maximo: cp.monto,
    sim_personal_cuota_mensual: cp.cuota,
    sim_personal_plazo_meses: CP_PLAZO_MESES,
    sim_personal_tae: 8,
    sim_personal_aprobado: simPersonal.aprobado ?? (cp.monto > 0),

    // ===== Hipoteca (cuota REAL + precio recomendado) =====
    sim_hipoteca_monto_financiable: hipotecaMontoFinanciable,
    sim_hipoteca_valor_max_inmueble: hipotecaValorMaxInmueble,
    sim_hipoteca_cuota_maxima: hipotecaCuotaReal,
    sim_hipoteca_cuota_real: hipotecaCuotaReal,
    sim_hipoteca_plazo_anos: simHipoteca.plazo_anos || simHipoteca.plazoAnios || 0,
    sim_hipoteca_aprobable: simHipoteca.aprobado ?? true,

    // ===== Extras (mantidos para uso futuro no Make) =====
    sim_hipoteca_precio_max_inmueble: simHipoteca.precio_maximo_inmueble || hipotecaValorMaxInmueble || 0,
    sim_hipoteca_precio_max_por_ahorros: simHipoteca.precio_max_por_ahorros || 0,
    sim_hipoteca_precio_max_por_ingresos: simHipoteca.precio_max_por_ingresos || 0,
    sim_hipoteca_credito_personal_max: simHipoteca.credito_personal_maximo || 0,

    // ===== CRM e documentos =====
    crm_url: `https://tuhogarposible.lovable.app/agente/crm?lead=${lead.id}`,
    bewor_link_documentos: beworLink || '',
    documentos_link: beworLink || '',
    bank_statement_upload_link: beworLink || '',
  };

  // Extras adicionais (test=true, assignment_type, etc.)
  Object.assign(payload, extra);

  // Log dos campos críticos para diagnóstico rápido
  console.log('[bitrixPayload] source:', source, '| lead:', lead.id);
  console.log('[bitrixPayload] sim_personal_monto_maximo:', payload.sim_personal_monto_maximo,
    '| sim_personal_cuota_mensual:', payload.sim_personal_cuota_mensual);
  console.log('[bitrixPayload] sim_hipoteca_monto_financiable:', payload.sim_hipoteca_monto_financiable,
    '| sim_hipoteca_valor_max_inmueble:', payload.sim_hipoteca_valor_max_inmueble,
    '| sim_hipoteca_cuota_maxima:', payload.sim_hipoteca_cuota_maxima);
  console.log('[bitrixPayload] fecha_reunion:', payload.lead_fecha_reunion,
    '| hora_reunion:', payload.lead_hora_reunion,
    '| reunion_datetime:', payload.lead_reunion_datetime,
    '| fecha_reunion_bitrix:', payload.lead_fecha_reunion_bitrix);

  return payload;
}
