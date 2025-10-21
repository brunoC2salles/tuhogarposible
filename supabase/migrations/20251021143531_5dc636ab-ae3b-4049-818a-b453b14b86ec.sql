-- Migration 3: Adicionar coluna agente_asignado_id em form_submissions

ALTER TABLE form_submissions 
ADD COLUMN IF NOT EXISTS agente_asignado_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN form_submissions.agente_asignado_id IS 'Agente designado automaticamente pelo sistema round-robin';