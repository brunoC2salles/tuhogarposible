-- Adicionar novos valores aos enums
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'nuevo_lead';
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'meta_ads';