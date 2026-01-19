-- Add 'no_cualificado' to the lead_stage enum
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'no_cualificado';