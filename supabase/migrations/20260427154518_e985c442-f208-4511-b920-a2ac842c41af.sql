ALTER TABLE public.lead_document_analysis
ADD COLUMN IF NOT EXISTS analysis_provider text NOT NULL DEFAULT 'bewor',
ADD COLUMN IF NOT EXISTS num_titulares integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS analysis_input jsonb,
ADD COLUMN IF NOT EXISTS extracted_financials jsonb,
ADD COLUMN IF NOT EXISTS confidence_score numeric,
ADD COLUMN IF NOT EXISTS manual_review_required boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS months_detected integer,
ADD COLUMN IF NOT EXISTS missing_months jsonb;

CREATE INDEX IF NOT EXISTS idx_lead_document_analysis_provider
ON public.lead_document_analysis (analysis_provider);

CREATE INDEX IF NOT EXISTS idx_lead_document_analysis_manual_review
ON public.lead_document_analysis (manual_review_required)
WHERE manual_review_required = true;