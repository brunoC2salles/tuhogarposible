-- ============================================
-- FASE 1: ESTRUTURA BASE - DATABASE
-- Academia de Agentes + Controle Financeiro
-- ============================================

-- 1. TABELA: training_videos
CREATE TABLE IF NOT EXISTS public.training_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  url_embed TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'proceso_ventas',
    'uso_plataforma', 
    'crm_leads',
    'simuladores',
    'contratos',
    'mejores_practicas'
  )),
  orden INTEGER DEFAULT 0,
  duracion_minutos INTEGER,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_training_videos_categoria ON public.training_videos(categoria);
CREATE INDEX IF NOT EXISTS idx_training_videos_activo ON public.training_videos(activo);

-- RLS para training_videos
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active videos"
  ON public.training_videos FOR SELECT
  TO authenticated
  USING (activo = true OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage videos"
  ON public.training_videos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para updated_at
CREATE TRIGGER update_training_videos_updated_at
  BEFORE UPDATE ON public.training_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. TABELA: document_templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'contrato_compra',
    'contrato_alquiler', 
    'documento_general',
    'plantilla'
  )),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_document_templates_tipo ON public.document_templates(tipo);
CREATE INDEX IF NOT EXISTS idx_document_templates_activo ON public.document_templates(activo);

-- RLS para document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active documents"
  ON public.document_templates FOR SELECT
  TO authenticated
  USING (activo = true OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage documents"
  ON public.document_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. TABELA: generated_contracts
CREATE TABLE IF NOT EXISTS public.generated_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  inmueble_id UUID REFERENCES public.inmuebles(id) ON DELETE SET NULL,
  tipo_contrato TEXT NOT NULL CHECK (tipo_contrato IN (
    'compra_venta',
    'alquiler',
    'reserva',
    'arras'
  )),
  datos_contrato JSONB NOT NULL,
  file_path TEXT,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_generated_contracts_lead ON public.generated_contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_inmueble ON public.generated_contracts(inmueble_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_generated_by ON public.generated_contracts(generated_by);

-- RLS para generated_contracts
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts"
  ON public.generated_contracts FOR SELECT
  TO authenticated
  USING (
    generated_by = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role) OR
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = generated_contracts.lead_id 
      AND leads.agente_asignado_id = auth.uid()
    )
  );

CREATE POLICY "Users can create contracts"
  ON public.generated_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    generated_by = auth.uid() AND (
      has_role(auth.uid(), 'admin'::user_role) OR
      EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = generated_contracts.lead_id 
        AND leads.agente_asignado_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all contracts"
  ON public.generated_contracts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- ============================================
-- 4. STORAGE BUCKETS

-- Bucket: training-materials (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-materials', 'training-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket: contract-templates (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-templates', 'contract-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket: generated-contracts (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-contracts', 'generated-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. STORAGE POLICIES

-- training-materials: público para leitura, admin para upload
CREATE POLICY "Public can view training materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'training-materials');

CREATE POLICY "Admins can upload training materials"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'training-materials' AND
    has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "Admins can update training materials"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'training-materials' AND
    has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "Admins can delete training materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'training-materials' AND
    has_role(auth.uid(), 'admin'::user_role)
  );

-- contract-templates: admin apenas
CREATE POLICY "Admins can view contract templates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contract-templates' AND
    (has_role(auth.uid(), 'admin'::user_role) OR auth.role() = 'authenticated')
  );

CREATE POLICY "Admins can manage contract templates"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'contract-templates' AND
    has_role(auth.uid(), 'admin'::user_role)
  )
  WITH CHECK (
    bucket_id = 'contract-templates' AND
    has_role(auth.uid(), 'admin'::user_role)
  );

-- generated-contracts: owner + admin
CREATE POLICY "Users can view own generated contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'generated-contracts' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::user_role))
  );

CREATE POLICY "Users can upload own contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-contracts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can manage all generated contracts"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'generated-contracts' AND
    has_role(auth.uid(), 'admin'::user_role)
  )
  WITH CHECK (
    bucket_id = 'generated-contracts' AND
    has_role(auth.uid(), 'admin'::user_role)
  );