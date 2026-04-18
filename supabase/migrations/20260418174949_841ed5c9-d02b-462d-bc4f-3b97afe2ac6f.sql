-- 1. Adicionar colunas estruturadas
ALTER TABLE public.lead_document_analysis
  ADD COLUMN IF NOT EXISTS holder_name TEXT,
  ADD COLUMN IF NOT EXISTS holder_dni TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS monthly_income NUMERIC;

-- 2. Backfill a partir do JSON result existente
UPDATE public.lead_document_analysis
SET
  holder_name = COALESCE(
    holder_name,
    NULLIF(TRIM(result -> 'result' -> 'document_fields' ->> 'holder'), ''),
    NULLIF(TRIM(result -> 'document_fields' ->> 'holder'), ''),
    NULLIF(TRIM(result ->> 'holder'), '')
  ),
  iban = COALESCE(
    iban,
    NULLIF(TRIM(result -> 'result' -> 'document_fields' ->> 'iban'), ''),
    NULLIF(TRIM(result -> 'document_fields' ->> 'iban'), ''),
    NULLIF(TRIM(result ->> 'iban'), '')
  ),
  bank_name = COALESCE(
    bank_name,
    NULLIF(TRIM(result -> 'result' -> 'document_fields' ->> 'bank'), ''),
    NULLIF(TRIM(result -> 'result' -> 'document_fields' ->> 'bank_name'), ''),
    NULLIF(TRIM(result -> 'document_fields' ->> 'bank'), ''),
    NULLIF(TRIM(result ->> 'bank'), '')
  ),
  period_start = COALESCE(
    period_start,
    CASE
      WHEN result -> 'result' -> 'document_fields' ->> 'period_start_date' ~ '^\d{2}/\d{2}/\d{4}$'
        THEN to_date(result -> 'result' -> 'document_fields' ->> 'period_start_date', 'DD/MM/YYYY')
      WHEN result -> 'document_fields' ->> 'period_start_date' ~ '^\d{2}/\d{2}/\d{4}$'
        THEN to_date(result -> 'document_fields' ->> 'period_start_date', 'DD/MM/YYYY')
      ELSE NULL
    END
  ),
  holder_dni = COALESCE(
    holder_dni,
    NULLIF(TRIM(result -> 'result' -> 'document_fields' ->> 'idNumber'), ''),
    NULLIF(TRIM(result -> 'document_fields' ->> 'idNumber'), '')
  )
WHERE result IS NOT NULL;