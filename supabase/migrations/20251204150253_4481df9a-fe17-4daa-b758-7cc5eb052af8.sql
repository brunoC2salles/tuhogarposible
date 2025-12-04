-- =============================================
-- FASE 1: Storage policies para lead-documents
-- =============================================

-- Drop e recriar política de SELECT para incluir supervisores
DROP POLICY IF EXISTS "Agents can view documents of their leads" ON storage.objects;

CREATE POLICY "Agents and supervisors can view lead documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lead-documents' AND (
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'supervisor'::user_role) OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id::text = (storage.foldername(name))[1]
        AND leads.agente_asignado_id = auth.uid()
    )
  )
);

-- =============================================
-- FASE 2: Políticas de tabelas de documentos
-- =============================================

-- 2.1 lead_document_checklist - SELECT para supervisor
DROP POLICY IF EXISTS "Agentes can view checklist of their leads" ON public.lead_document_checklist;

CREATE POLICY "Agents and supervisors can view checklist"
ON public.lead_document_checklist FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_document_checklist.lead_id
      AND (
        leads.agente_asignado_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::user_role) OR
        has_role(auth.uid(), 'supervisor'::user_role)
      )
  )
);

-- 2.2 lead_comments - SELECT para supervisor
DROP POLICY IF EXISTS "Agents can view comments of their leads" ON public.lead_comments;

CREATE POLICY "Agents and supervisors can view comments"
ON public.lead_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_comments.lead_id
      AND (
        leads.agente_asignado_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::user_role) OR
        has_role(auth.uid(), 'supervisor'::user_role)
      )
  )
);

-- 2.3 lead_external_links - SELECT para supervisor
DROP POLICY IF EXISTS "Agentes can view links of their leads" ON public.lead_external_links;

CREATE POLICY "Agents and supervisors can view links"
ON public.lead_external_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_external_links.lead_id
      AND (
        leads.agente_asignado_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::user_role) OR
        has_role(auth.uid(), 'supervisor'::user_role)
      )
  )
);

-- 2.4 generated_contracts - SELECT para supervisor
DROP POLICY IF EXISTS "Users can view own contracts" ON public.generated_contracts;

CREATE POLICY "Users and supervisors can view contracts"
ON public.generated_contracts FOR SELECT
USING (
  generated_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::user_role) OR
  has_role(auth.uid(), 'supervisor'::user_role) OR
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = generated_contracts.lead_id
      AND leads.agente_asignado_id = auth.uid()
  )
);