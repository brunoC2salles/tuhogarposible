-- ============================================
-- MIGRATION: Sistema CRM - Leads
-- ============================================

-- 1. Criar ENUM para estágios do lead
CREATE TYPE public.lead_stage AS ENUM (
  'nuevo_lead',
  'primera_llamada',
  'visita_agendada',
  'acuerdo',
  'listo'
);

-- 2. Criar ENUM para origem do lead
CREATE TYPE public.lead_source AS ENUM (
  'formulario_web',
  'manual',
  'tidycal_webhook'
);

-- 3. Criar tabela leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  zona_interes TEXT,
  ciudad_interes TEXT,
  valor_inmueble_deseado NUMERIC,
  
  -- JSON com dados completos dos simuladores
  simulador_personal_data JSONB,
  simulador_hipotecario_data JSONB,
  
  -- Controle de pipeline
  stage public.lead_stage NOT NULL DEFAULT 'nuevo_lead',
  agente_asignado_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadados
  source public.lead_source NOT NULL DEFAULT 'manual',
  notas TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_stage_change_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS em leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 5. Criar tabela de relacionamento leads <-> inmuebles
CREATE TABLE public.lead_inmuebles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  inmueble_id UUID NOT NULL REFERENCES public.inmuebles(id) ON DELETE CASCADE,
  vinculado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, inmueble_id)
);

-- 6. Habilitar RLS em lead_inmuebles
ALTER TABLE public.lead_inmuebles ENABLE ROW LEVEL SECURITY;

-- 7. Criar tabela de histórico de movimentações
CREATE TABLE public.lead_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage_anterior public.lead_stage,
  stage_nuevo public.lead_stage NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Habilitar RLS em lead_historico
ALTER TABLE public.lead_historico ENABLE ROW LEVEL SECURITY;

-- 9. Trigger para atualizar updated_at em leads
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Trigger para log de mudanças de estágio
CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.lead_historico (lead_id, stage_anterior, stage_nuevo, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
    
    NEW.last_stage_change_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_lead_stage_change_trigger
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_stage_change();

-- 11. RLS Policies para LEADS

-- Agentes veem apenas seus leads
CREATE POLICY "Agentes can view own leads"
ON public.leads FOR SELECT
TO authenticated
USING (
  auth.uid() = agente_asignado_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Agentes podem criar leads (serão automaticamente atribuídos a eles)
CREATE POLICY "Agentes can create leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = agente_asignado_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Agentes podem atualizar apenas seus leads
CREATE POLICY "Agentes can update own leads"
ON public.leads FOR UPDATE
TO authenticated
USING (
  auth.uid() = agente_asignado_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Agentes podem deletar apenas seus leads
CREATE POLICY "Agentes can delete own leads"
ON public.leads FOR DELETE
TO authenticated
USING (
  auth.uid() = agente_asignado_id
  OR public.has_role(auth.uid(), 'admin')
);

-- 12. RLS Policies para LEAD_INMUEBLES

CREATE POLICY "Users can view lead inmuebles if they own the lead"
ON public.lead_inmuebles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_inmuebles.lead_id
      AND (leads.agente_asignado_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can link inmuebles to their leads"
ON public.lead_inmuebles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_inmuebles.lead_id
      AND (leads.agente_asignado_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can unlink inmuebles from their leads"
ON public.lead_inmuebles FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_inmuebles.lead_id
      AND (leads.agente_asignado_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- 13. RLS Policies para LEAD_HISTORICO

CREATE POLICY "Users can view historico of their leads"
ON public.lead_historico FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_historico.lead_id
      AND (leads.agente_asignado_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- 14. Índices para performance
CREATE INDEX idx_leads_agente_asignado ON public.leads(agente_asignado_id);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_lead_inmuebles_lead_id ON public.lead_inmuebles(lead_id);
CREATE INDEX idx_lead_inmuebles_inmueble_id ON public.lead_inmuebles(inmueble_id);
CREATE INDEX idx_lead_historico_lead_id ON public.lead_historico(lead_id);

-- 15. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.lead_inmuebles TO authenticated;
GRANT SELECT ON public.lead_historico TO authenticated;