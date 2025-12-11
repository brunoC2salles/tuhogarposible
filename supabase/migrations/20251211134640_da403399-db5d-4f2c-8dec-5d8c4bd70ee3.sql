-- Adicionar os novos valores ao enum lead_stage
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'preparacion_expediente';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'pretasacion';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'aprobacion_bancaria';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'tasacion';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'cobrar';