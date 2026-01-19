-- Alterar o default da tabela leads para nuevo_lead
ALTER TABLE leads ALTER COLUMN stage SET DEFAULT 'nuevo_lead'::lead_stage;