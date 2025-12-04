export type NotificationType = 
  | 'new_lead' 
  | 'lead_stage_listo' 
  | 'payment_deadline' 
  | 'contract_signed'
  | 'contract_generated'
  | 'candidate_stage_change'
  | 'new_message';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata: Record<string, any>;
  read: boolean;
  created_at: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_lead: 'Nuevo Lead',
  lead_stage_listo: 'Lead Listo',
  payment_deadline: 'Plazo de Pago',
  contract_signed: 'Contrato Firmado',
  contract_generated: 'Contrato Generado',
  candidate_stage_change: 'Candidato Cambió Etapa',
  new_message: 'Nuevo Mensaje'
};
