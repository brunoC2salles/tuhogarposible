export type NotificationType = 
  | 'new_lead' 
  | 'lead_stage_listo' 
  | 'payment_deadline' 
  | 'contract_signed'
  | 'contract_generated';

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
  new_lead: 'Novo Lead',
  lead_stage_listo: 'Lead Pronto',
  payment_deadline: 'Prazo de Pagamento',
  contract_signed: 'Contrato Assinado',
  contract_generated: 'Contrato Gerado'
};
