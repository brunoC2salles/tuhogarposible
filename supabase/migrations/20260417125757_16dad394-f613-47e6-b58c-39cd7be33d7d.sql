-- Adiciona novo tipo de notificação
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'document_analysis_completed';

-- Tabela de tokens públicos para upload de documentos
CREATE TABLE public.lead_document_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_document_tokens_token ON public.lead_document_tokens(token);
CREATE INDEX idx_lead_document_tokens_lead_id ON public.lead_document_tokens(lead_id);

ALTER TABLE public.lead_document_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view tokens of their leads"
ON public.lead_document_tokens FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_tokens.lead_id
      AND (leads.agente_asignado_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::user_role)
        OR has_role(auth.uid(), 'supervisor'::user_role))
  )
);

CREATE POLICY "Agents can create tokens for their leads"
ON public.lead_document_tokens FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_tokens.lead_id
      AND (leads.agente_asignado_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Agents can delete tokens of their leads"
ON public.lead_document_tokens FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_tokens.lead_id
      AND (leads.agente_asignado_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- Tabela de análises de documentos
CREATE TABLE public.lead_document_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  request_id text,
  tipo text NOT NULL DEFAULT 'movimientos_bancarios',
  status text NOT NULL DEFAULT 'CREATED',
  file_path text,
  result jsonb,
  viabilidade_sugerida jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_document_analysis_lead_id ON public.lead_document_analysis(lead_id);
CREATE INDEX idx_lead_document_analysis_request_id ON public.lead_document_analysis(request_id);
CREATE INDEX idx_lead_document_analysis_status ON public.lead_document_analysis(status);

ALTER TABLE public.lead_document_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents and supervisors can view document analysis"
ON public.lead_document_analysis FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_analysis.lead_id
      AND (leads.agente_asignado_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::user_role)
        OR has_role(auth.uid(), 'supervisor'::user_role))
  )
);

CREATE POLICY "Admins can manage all document analysis"
ON public.lead_document_analysis FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para updated_at
CREATE TRIGGER update_lead_document_analysis_updated_at
BEFORE UPDATE ON public.lead_document_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_document_analysis;
ALTER TABLE public.lead_document_analysis REPLICA IDENTITY FULL;