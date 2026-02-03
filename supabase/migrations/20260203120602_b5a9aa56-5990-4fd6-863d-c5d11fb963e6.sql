-- Add precualificacion to enum and migrate orphan lead
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'precualificacion';

-- Migrate the 1 lead still in mandamos_expediente to new stage
UPDATE leads 
SET stage = 'subida_expediente_bancos'
WHERE stage = 'mandamos_expediente';