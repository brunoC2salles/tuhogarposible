export type LeadStage = 
  | 'nuevo_lead' 
  | 'llamada'
  | 'buscando_vivienda'
  | 'vivienda_encontrada'
  | 'documentacion_ok'
  | 'tasacion_prevision'
  | 'firma_contrato'
  | 'informacion_riesgos'
  | 'fein' 
  | 'llamada_consultoria'
  | 'descualificados';

export type LeadSource = 'formulario_web' | 'manual' | 'tidycal_webhook' | 'meta_ads' | 'tally';

export interface SimuladorPersonalData {
  montoSolicitado: number;
  plazoMeses: number;
  tasaInteres: number;
  cuotaMensual: number;
  totalPagar: number;
  totalIntereses: number;
}

export interface SimuladorHipotecarioData {
  valorInmueble: number;
  porcentajeFinanciamiento: number;
  montoFinanciable: number;
  capitalPropioNecesario: number;
  tasaInteres: number;
  plazoAnios: number;
  ingresoMensual: number;
  cuotaMensual: number;
  relacionCuotaIngreso: number;
  capacidadEndeudamiento: number;
  /** Precio máximo de inmueble recomendado (leads Meta/Tally). */
  precio_maximo_inmueble?: number;
  /** Regla de precio mínimo por área (webhooks de entrada). */
  zona_precio_minimo?: number;
  zona_precio_base?: number;
  zona_precio_metodo?: string;
  zona_precio_sin_dato?: boolean;
  zona_cod_muni?: string | null;
  zona_municipio?: string | null;
  zona_ccaa?: string | null;
  zona_distrito?: string | null;
  zona_precio_m2?: number | null;
  zona_superficie_ref?: number | null;
  zona_confianza?: string | null;
  zona_cualificado?: boolean;
  /** Auditoría de la regla de precio mínimo por área. */
  zona_superficie_origen?: 'lead' | 'ciudad' | 'municipio' | null;
  zona_precio_fuente?: 'distrito' | 'municipio' | 'ccaa' | null;
  zona_margen_aplicado?: number;
  zona_max_financiable?: number;
  zona_razon?: string | null;
  zona_evaluado_at?: string | null;
}

export interface Lead {
  id: string;
  nombre_completo: string;
  telefono: string;
  email: string;
  zona_interes?: string;
  ciudad_interes?: string;
  valor_inmueble_deseado?: number;
  simulador_personal_data?: SimuladorPersonalData;
  simulador_hipotecario_data?: SimuladorHipotecarioData;
  stage: LeadStage;
  agente_asignado_id?: string;
  source: LeadSource;
  notas?: string;
  fecha_reunion?: string | null;
  hora_reunion?: string | null;
  hora_reunion_texto?: string | null;
  zona_horaria_reunion?: string | null;
  reunion_datetime?: string | null;
  created_at: string;
  updated_at: string;
  last_stage_change_at: string;
  agente_nombre?: string;
  /** Precio de la vivienda seleccionada (formulario Meta, 21/10/2026) */
  precio_vivienda?: number | null;
  precio_vivienda_texto?: string | null;
  /** Vivienda > 130 % del máximo financiable (o precio ilegible): se queda en Buscando Vivienda para revisar */
  vivienda_revisar?: boolean;
  vivienda_revisar_motivo?: string | null;
  /** Visita agendada en una vivienda (marca manual del agente en Buscando Vivienda, 21/10/2026).
   *  Se quita automáticamente al salir de la etapa; los cambios quedan en lead_historico. */
  visita_agendada?: boolean;
  /** Llamada realizada (marca manual del agente/admin, 22/10/2026).
   *  Se mantiene al cambiar de etapa; los cambios quedan en lead_historico. */
  llamada_realizada?: boolean;
}

export interface LeadInmueble {
  id: string;
  lead_id: string;
  inmueble_id: string;
  vinculado_por: string;
  created_at: string;
}

export interface LeadHistorico {
  id: string;
  lead_id: string;
  stage_anterior?: LeadStage;
  stage_nuevo: LeadStage;
  changed_by: string;
  notas?: string;
  created_at: string;
}

export interface LeadFormData {
  nombre_completo: string;
  telefono: string;
  email: string;
  zona_interes?: string;
  ciudad_interes?: string;
  valor_inmueble_deseado?: number;
  notas?: string;
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  nuevo_lead: 'Cualificado',
  llamada: 'Llamada',
  buscando_vivienda: 'Buscando Vivienda',
  vivienda_encontrada: 'Vivienda encontrada',
  documentacion_ok: 'Documentación OK',
  tasacion_prevision: 'Pago tasación y mandar tasador',
  firma_contrato: 'Firma del contrato',
  informacion_riesgos: 'Documentación a Riesgos',
  fein: 'FEIN',
  llamada_consultoria: 'Avanzo con Unicaja',
  descualificados: 'Descualificado'
};

// Etapas ocultas no frontend (decisão Bruno 27/10/2026): continuam existindo no banco
// (nuevo_lead é o default da coluna e é usado pelas automações Spoki), mas não aparecem
// no kanban, no seletor de etapa, nos filtros nem nas contagens/métricas.
export const HIDDEN_STAGES: LeadStage[] = ['nuevo_lead', 'llamada_consultoria'];

export const STAGE_ORDER: LeadStage[] = [
  'buscando_vivienda',
  'vivienda_encontrada',
  'documentacion_ok',
  'tasacion_prevision',
  'firma_contrato',
  'informacion_riesgos',
  'fein',
  'descualificados'
];
