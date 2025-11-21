-- Crear tabla para checklist de documentos de leads
CREATE TABLE IF NOT EXISTS public.lead_document_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Documentos de identidad
  dni_nie_ambas_caras BOOLEAN DEFAULT FALSE,
  dni_pais_origen BOOLEAN DEFAULT FALSE,
  
  -- Documentos fiscales
  ultima_renta BOOLEAN DEFAULT FALSE,
  dos_ultimas_rentas_autonomo BOOLEAN DEFAULT FALSE,
  cuatro_modelos_trimestrales BOOLEAN DEFAULT FALSE,
  
  -- Documentos laborales
  contrato_trabajo BOOLEAN DEFAULT FALSE,
  tres_ultimas_nominas BOOLEAN DEFAULT FALSE,
  vida_laboral BOOLEAN DEFAULT FALSE,
  
  -- Documentos bancarios
  movimientos_bancarios_6_meses BOOLEAN DEFAULT FALSE,
  
  -- Documentos de préstamos
  tres_recibos_prestamos BOOLEAN DEFAULT FALSE,
  cuadro_amortizacion_prestamos BOOLEAN DEFAULT FALSE,
  justificante_deuda_saldada BOOLEAN DEFAULT FALSE,
  
  -- Documentos de hipoteca existente
  tres_recibos_hipoteca BOOLEAN DEFAULT FALSE,
  cuadro_amortizacion_hipoteca BOOLEAN DEFAULT FALSE,
  
  -- Documentos de la vivienda
  nota_simple BOOLEAN DEFAULT FALSE,
  arras_vivienda_no_bancaria BOOLEAN DEFAULT FALSE,
  fotos_vivienda BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(lead_id)
);

-- Enable RLS
ALTER TABLE public.lead_document_checklist ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Agentes can view checklist of their leads"
ON public.lead_document_checklist
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_checklist.lead_id
    AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Agentes can update checklist of their leads"
ON public.lead_document_checklist
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_checklist.lead_id
    AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Agentes can insert checklist for their leads"
ON public.lead_document_checklist
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_checklist.lead_id
    AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lead_document_checklist_updated_at
BEFORE UPDATE ON public.lead_document_checklist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();