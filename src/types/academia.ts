export type VideoCategory = 
  | 'proceso_ventas' 
  | 'uso_plataforma' 
  | 'crm_leads' 
  | 'simuladores' 
  | 'contratos' 
  | 'mejores_practicas';

export interface TrainingVideo {
  id: string;
  titulo: string;
  descripcion?: string;
  url_embed: string;
  categoria: VideoCategory;
  orden: number;
  duracion_minutos?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const CATEGORIA_LABELS: Record<VideoCategory, string> = {
  proceso_ventas: 'Proceso de Ventas',
  uso_plataforma: 'Uso de la Plataforma',
  crm_leads: 'CRM y Leads',
  simuladores: 'Simuladores',
  contratos: 'Contratos y Documentación',
  mejores_practicas: 'Mejores Prácticas'
};

export type DocumentType = 
  | 'contrato_compra' 
  | 'documento_general' 
  | 'plantilla';

export interface DocumentTemplate {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: DocumentType;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contrato_compra: 'Contrato de Compra',
  documento_general: 'Documento General',
  plantilla: 'Plantilla'
};
