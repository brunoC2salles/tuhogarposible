-- Atualizar o valor padrão da coluna stage para o novo primeiro estágio
ALTER TABLE leads ALTER COLUMN stage SET DEFAULT 'preparacion_expediente'::lead_stage;