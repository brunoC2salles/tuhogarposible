export type LeadStage = 
  | 'nuevo_lead' 
  | 'preparacion_expediente' 
  | 'precualificacion'
  | 'subida_expediente_bancos' 
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
  nuevo_lead: 'Nuevo Leads',
  preparacion_expediente: 'Preparación Expediente - Fresha',
  precualificacion: 'Precualificación - Edu',
  subida_expediente_bancos: 'Subida Expediente a Bancos - Gibobs',
  descualificados: 'Descualificados'
};

export const STAGE_ORDER: LeadStage[] = [
  'nuevo_lead',
  'preparacion_expediente',
  'precualificacion',
  'subida_expediente_bancos',
  'descualificados'
];
