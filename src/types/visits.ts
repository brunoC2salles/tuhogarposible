export interface LeadVisit {
  id: string;
  lead_id: string;
  agente_id: string;
  fecha_visita: string;
  product_urls: string[];
  tiene_reserva: boolean;
  reserva_url: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  lead_nombre?: string;
  agente_nombre?: string;
}

export interface LeadVisitFormData {
  lead_id: string;
  fecha_visita: string;
  product_urls: string[];
  tiene_reserva: boolean;
  reserva_url: string | null;
  notas?: string | null;
}
