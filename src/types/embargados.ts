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
  spoki_enviado_at: string | null;
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

/** Preguntas del formulario Meta (mismas etiquetas que guarda embargados-webhook) */
export const EMBARGADOS_PREGUNTAS = [
  { key: 'Importe inicial de la hipoteca', label: '¿Cuál es el importe inicial de la hipoteca?' },
  { key: 'Pagado hasta ahora', label: '¿Cuánto has pagado aproximadamente de la hipoteca hasta ahora?' },
  { key: 'Capital pendiente', label: '¿Cuánto capital te queda pendiente de pagar actualmente?' },
  { key: 'Meses de retraso', label: '¿Cuántos meses llevas de retraso en el pago de la hipoteca?' },
  { key: 'Valor de mercado actual', label: '¿Cuál es el precio estimado de tu vivienda según su valor de mercado actual?' },
] as const;

export interface NuevoEmbargadoData {
  nombre_completo: string;
  telefono: string;
  email: string;
  ciudad: string;
  stage: EmbargadoStage;
  respuestas: Record<string, string>;
}

export const EMBARGADOS_CRM_PATH = '/crm/embargados';
