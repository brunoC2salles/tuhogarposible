-- Atualizar registros existentes de "Geral" para "General" em agent_assignment_tracking
UPDATE agent_assignment_tracking 
SET region = 'General' 
WHERE region = 'Geral';