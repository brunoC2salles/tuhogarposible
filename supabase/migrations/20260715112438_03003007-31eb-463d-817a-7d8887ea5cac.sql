ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'tally';

CREATE INDEX IF NOT EXISTS idx_leads_telefono_created ON public.leads (telefono, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email_created ON public.leads (lower(email), created_at DESC);