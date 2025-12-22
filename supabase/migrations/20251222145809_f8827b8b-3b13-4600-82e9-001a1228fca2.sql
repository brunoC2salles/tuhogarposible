-- Migration 1: Add new enum values for lead_stage
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'recopilacion_expediente';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'mandamos_expediente';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'cobro';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'finalizada';