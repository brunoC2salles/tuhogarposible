-- Backfill: corrigir registos onde holder_name veio como "[object Object]" 
-- ou vazio quando o JSON tem dados estruturados utilizáveis.
UPDATE public.lead_document_analysis
SET
  holder_name = COALESCE(
    -- Tenta extrair nome do primeiro holder objeto
    NULLIF(TRIM((result -> 'result' -> 'document_fields' -> 'holders' -> 0 ->> 'name')), ''),
    NULLIF(TRIM((result -> 'document_fields' -> 'holders' -> 0 ->> 'name')), ''),
    -- Se holders é array de strings
    NULLIF(TRIM(result -> 'result' -> 'document_fields' -> 'holders' ->> 0), ''),
    NULLIF(TRIM(result -> 'document_fields' -> 'holders' ->> 0), '')
  ),
  holder_dni = COALESCE(
    holder_dni,
    NULLIF(TRIM((result -> 'result' -> 'document_fields' -> 'holders' -> 0 ->> 'idNumber')), ''),
    NULLIF(TRIM((result -> 'document_fields' -> 'holders' -> 0 ->> 'idNumber')), '')
  ),
  bank_name = COALESCE(
    bank_name,
    NULLIF(TRIM(result -> 'result' -> 'document_fields' ->> 'financial_entity_text'), ''),
    NULLIF(TRIM(result -> 'document_fields' ->> 'financial_entity_text'), ''),
    NULLIF(TRIM(result -> 'result' -> 'document_fields' ->> 'financial_entity_normalized'), ''),
    NULLIF(TRIM(result -> 'document_fields' ->> 'financial_entity_normalized'), '')
  )
WHERE result IS NOT NULL
  AND (
    holder_name IS NULL
    OR holder_name = '[object Object]'
    OR holder_name LIKE '%[object Object]%'
    OR bank_name IS NULL
  );