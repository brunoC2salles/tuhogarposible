-- Fase 2: Migrar leads existentes para os novos estágios

-- Criar tabela de backup para rastrear a migração (caso precise reverter)
CREATE TABLE IF NOT EXISTS _leads_stage_migration_backup AS
SELECT id, stage as old_stage, now() as migrated_at FROM leads WHERE 1=0;

-- Inserir backup dos leads atuais
INSERT INTO _leads_stage_migration_backup (id, old_stage, migrated_at)
SELECT id, stage, now() FROM leads;

-- Migrar: recopilacion_expediente → preparacion_expediente
UPDATE leads 
SET stage = 'preparacion_expediente'::lead_stage 
WHERE stage = 'recopilacion_expediente'::lead_stage;

-- Migrar: mandamos_expediente, aprobacion_bancaria, tasacion, cobro, finalizada → subida_expediente_bancos
UPDATE leads 
SET stage = 'subida_expediente_bancos'::lead_stage 
WHERE stage IN (
  'mandamos_expediente'::lead_stage, 
  'aprobacion_bancaria'::lead_stage, 
  'tasacion'::lead_stage, 
  'cobro'::lead_stage, 
  'finalizada'::lead_stage
);

-- Migrar: no_cualificado → descualificados
UPDATE leads 
SET stage = 'descualificados'::lead_stage 
WHERE stage = 'no_cualificado'::lead_stage;