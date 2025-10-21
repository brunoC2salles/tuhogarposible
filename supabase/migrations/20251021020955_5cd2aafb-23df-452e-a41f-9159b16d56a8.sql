-- ========================================
-- FASE 2: Estrutura de dados para formulário público
-- ========================================

-- Criar tabela form_submissions para armazenar respostas do formulário
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Dados pessoais
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  edad INTEGER NOT NULL CHECK (edad >= 18 AND edad <= 55),
  
  -- Dados de interesse
  ciudad_interes TEXT,
  zona_interes TEXT,
  valor_inmueble_deseado NUMERIC,
  
  -- Dados financeiros
  ingresos_mensuales NUMERIC NOT NULL,
  deudas_actuales NUMERIC DEFAULT 0,
  entrada_disponible NUMERIC DEFAULT 0,
  
  -- Dados de emprego e benefícios
  situacion_laboral TEXT CHECK (situacion_laboral IN ('autonomo', 'empleado')),
  familia_numerosa BOOLEAN DEFAULT false,
  menor_de_35 BOOLEAN DEFAULT false,
  comunidad_autonoma TEXT,
  
  -- Resultados dos simuladores (calculados automaticamente)
  simulador_personal_data JSONB,
  simulador_hipotecario_data JSONB,
  
  -- Status de processamento
  processed BOOLEAN NOT NULL DEFAULT false,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Integração Tidycal
  tidycal_scheduled BOOLEAN DEFAULT false,
  tidycal_link TEXT,
  tidycal_booking_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_form_submissions_email ON public.form_submissions(email);
CREATE INDEX idx_form_submissions_processed ON public.form_submissions(processed);
CREATE INDEX idx_form_submissions_lead_id ON public.form_submissions(lead_id);
CREATE INDEX idx_form_submissions_created_at ON public.form_submissions(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins podem ver todas as submissões
CREATE POLICY "Admins can view all form submissions"
ON public.form_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policy: Agentes podem ver submissões linkadas aos seus leads
CREATE POLICY "Agentes can view submissions linked to their leads"
ON public.form_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = form_submissions.lead_id
    AND leads.agente_asignado_id = auth.uid()
  )
);

-- RLS Policy: Admins podem atualizar submissões
CREATE POLICY "Admins can update form submissions"
ON public.form_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policy: Permitir inserção sem autenticação (para edge function)
CREATE POLICY "Allow anonymous insert for form submissions"
ON public.form_submissions
FOR INSERT
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();