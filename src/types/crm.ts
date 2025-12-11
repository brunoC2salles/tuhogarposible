export type LeadStage = 'preparacion_expediente' | 'pretasacion' | 'aprobacion_bancaria' | 'tasacion' | 'cobrar' | 'listo';
export type LeadSource = 'formulario_web' | 'manual' | 'tidycal_webhook';

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
  preparacion_expediente: 'Preparación de Expediente',
  pretasacion: 'Pretasación',
  aprobacion_bancaria: 'Aprobación Bancaria',
  tasacion: 'Tasación',
  cobrar: 'Cobrar',
  listo: 'Listo!'
};

export const STAGE_ORDER: LeadStage[] = [
  'preparacion_expediente',
  'pretasacion',
  'aprobacion_bancaria',
  'tasacion',
  'cobrar',
  'listo'
];
