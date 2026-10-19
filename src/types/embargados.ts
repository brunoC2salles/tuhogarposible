/** CRM Embargados (producto 2) — leads separados de los de hipoteca */
export type EmbargadoStage = 'contactado' | 'en_proceso' | 'exito' | 'descualificados';

export interface EmbargadoLead {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  stage: EmbargadoStage;
  cualificado: boolean | null;
  motivo_descualificacion: string | null;
  respuestas: Record<string, unknown>;
  notas: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  last_stage_change_at: string;
}

export const EMBARGADOS_STAGE_ORDER: EmbargadoStage[] = ['contactado', 'en_proceso', 'exito', 'descualificados'];

export const EMBARGADOS_STAGE_LABELS: Record<EmbargadoStage, string> = {
  contactado: 'Contactado',
  en_proceso: 'En proceso',
  exito: 'Éxito',
  descualificados: 'Descualificados',
};

export const EMBARGADOS_CRM_PATH = '/crm/embargados';
