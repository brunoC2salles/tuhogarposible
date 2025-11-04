-- Adicionar foreign key constraint entre leads e profiles
-- Isso permite que PostgREST faça join automático e mantém integridade referencial
ALTER TABLE public.leads
ADD CONSTRAINT fk_leads_agente_asignado
FOREIGN KEY (agente_asignado_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL  -- Se agente for deletado, lead mantém mas sem agente
ON UPDATE CASCADE;  -- Se ID do perfil mudar, atualiza automaticamente

-- Adicionar índice para melhorar performance dos joins
CREATE INDEX IF NOT EXISTS idx_leads_agente_asignado_id 
ON public.leads(agente_asignado_id);

COMMENT ON CONSTRAINT fk_leads_agente_asignado ON public.leads 
IS 'Foreign key para relacionar lead com perfil do agente asignado. ON DELETE SET NULL preserva leads quando agente é deletado.';