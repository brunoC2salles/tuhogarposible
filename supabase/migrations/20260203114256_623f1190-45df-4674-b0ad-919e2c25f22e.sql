-- Fase 1: Adicionar novos valores ao ENUM lead_stage
-- (PostgreSQL não permite remover valores de ENUM, apenas adicionar)

ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'preparacion_expediente';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'subida_expediente_bancos';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'descualificados';