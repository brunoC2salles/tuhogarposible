export type AgentCandidateStage = 
  | 'nuevo_contacto'
  | 'mensaje_whatsapp'
  | 'primera_reunion'
  | 'segunda_reunion_presentacion'
  | 'reunion_dudas_albert'
  | 'dudas_contrato'
  | 'pago'
  | 'rellenar_perfil'
  | 'cerrado';

export interface AgentCandidate {
  id: string;
  nombre_completo: string;
  telefono: string;
  email: string;
  ciudad?: string;
  dni?: string;
  stage: AgentCandidateStage;
  notas?: string;
  created_at: string;
  updated_at: string;
  last_stage_change_at: string;
  created_by?: string;
}

export interface AgentCandidateDocument {
  id: string;
  candidate_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
}

export interface AgentCandidateFormData {
  nombre_completo: string;
  telefono: string;
  email: string;
  ciudad?: string;
  dni?: string;
  notas?: string;
}

export const CANDIDATE_STAGE_LABELS: Record<AgentCandidateStage, string> = {
  nuevo_contacto: 'Nuevo Contacto',
  mensaje_whatsapp: 'Mensaje WhatsApp',
  primera_reunion: 'Primera Reunión',
  segunda_reunion_presentacion: 'Segunda Reunión y Presentación',
  reunion_dudas_albert: 'Reunión de Dudas con Albert',
  dudas_contrato: 'Dudas y Contrato',
  pago: 'Pago',
  rellenar_perfil: 'Rellenar Información de Perfil',
  cerrado: 'Cerrado'
};

export const CANDIDATE_STAGE_ORDER: AgentCandidateStage[] = [
  'nuevo_contacto',
  'mensaje_whatsapp',
  'primera_reunion',
  'segunda_reunion_presentacion',
  'reunion_dudas_albert',
  'dudas_contrato',
  'pago',
  'rellenar_perfil',
  'cerrado'
];
