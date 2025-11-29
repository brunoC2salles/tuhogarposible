-- ============================================
-- FASE 1: SISTEMA DE COMENTÁRIOS DE LEAD
-- ============================================

-- Tabela para comentários dos leads
CREATE TABLE lead_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para performance
CREATE INDEX idx_lead_comments_lead_id ON lead_comments(lead_id);
CREATE INDEX idx_lead_comments_created_at ON lead_comments(created_at DESC);

-- RLS para lead_comments
ALTER TABLE lead_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view comments of their leads"
  ON lead_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_comments.lead_id 
      AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
    )
  );

CREATE POLICY "Agents can create comments on their leads"
  ON lead_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_id 
      AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
    )
  );

CREATE POLICY "Agents can delete their own comments"
  ON lead_comments FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));

-- ============================================
-- FASE 2: KANBAN DE RECRUTAMENTO DE AGENTES
-- ============================================

-- Enum para estágios do candidato
CREATE TYPE agent_candidate_stage AS ENUM (
  'nuevo_contacto',
  'mensaje_whatsapp',
  'primera_reunion',
  'segunda_reunion_presentacion',
  'reunion_dudas_albert',
  'dudas_contrato',
  'pago',
  'rellenar_perfil',
  'cerrado'
);

-- Tabela de candidatos a agente
CREATE TABLE agent_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  ciudad TEXT,
  dni TEXT,
  stage agent_candidate_stage NOT NULL DEFAULT 'nuevo_contacto',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_stage_change_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Tabela para documentos dos candidatos
CREATE TABLE agent_candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES agent_candidates(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_agent_candidates_stage ON agent_candidates(stage);
CREATE INDEX idx_agent_candidates_created_at ON agent_candidates(created_at DESC);
CREATE INDEX idx_agent_candidate_documents_candidate_id ON agent_candidate_documents(candidate_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_agent_candidate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_candidate_updated_at
  BEFORE UPDATE ON agent_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_candidate_updated_at();

-- Trigger para atualizar last_stage_change_at quando stage muda
CREATE OR REPLACE FUNCTION update_candidate_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.last_stage_change_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_candidate_stage_change
  BEFORE UPDATE ON agent_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_stage_change();

-- RLS para agent_candidates - APENAS ADMIN
ALTER TABLE agent_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage candidates"
  ON agent_candidates FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS para agent_candidate_documents - APENAS ADMIN
ALTER TABLE agent_candidate_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage candidate documents"
  ON agent_candidate_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- ============================================
-- FASE 3: RASTREAMENTO DE ABANDONO DE FORMULÁRIO
-- ============================================

-- Tabela para submissões parciais do formulário
CREATE TABLE form_partial_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  email TEXT,
  telefono TEXT,
  nombre_completo TEXT,
  step_reached INTEGER DEFAULT 1,
  form_data JSONB DEFAULT '{}',
  abandoned BOOLEAN DEFAULT true,
  recovered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  abandoned_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_form_partial_session_id ON form_partial_submissions(session_id);
CREATE INDEX idx_form_partial_abandoned ON form_partial_submissions(abandoned) WHERE abandoned = true;
CREATE INDEX idx_form_partial_telefono ON form_partial_submissions(telefono) WHERE telefono IS NOT NULL;
CREATE INDEX idx_form_partial_created_at ON form_partial_submissions(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_form_partial_updated_at
  BEFORE UPDATE ON form_partial_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para form_partial_submissions
ALTER TABLE form_partial_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all partial submissions"
  ON form_partial_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update partial submissions"
  ON form_partial_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Anyone can create partial submission"
  ON form_partial_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update own session by session_id"
  ON form_partial_submissions FOR UPDATE
  USING (true);

-- ============================================
-- STORAGE BUCKETS (via SQL)
-- ============================================

-- Bucket para gravações de reuniões
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead-recordings', 'lead-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para lead-recordings
CREATE POLICY "Authenticated users can upload recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-recordings' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view recordings of their leads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lead-recordings' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR has_role(auth.uid(), 'admin'::user_role)
    )
  );

CREATE POLICY "Users can delete their own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lead-recordings' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR has_role(auth.uid(), 'admin'::user_role)
    )
  );

-- Bucket para documentos de candidatos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-candidate-documents', 'agent-candidate-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para agent-candidate-documents - APENAS ADMIN
CREATE POLICY "Only admins can upload candidate documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-candidate-documents' 
    AND has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "Only admins can view candidate documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agent-candidate-documents' 
    AND has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "Only admins can delete candidate documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agent-candidate-documents' 
    AND has_role(auth.uid(), 'admin'::user_role)
  );