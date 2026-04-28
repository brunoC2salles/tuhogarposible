UPDATE public.lead_document_analysis
SET
  months_detected = 13,
  missing_months = '[]'::jsonb,
  manual_review_required = true,
  viabilidade_sugerida = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(viabilidade_sugerida, '{}'::jsonb),
            '{months_detected}',
            '13'::jsonb,
            true
          ),
          '{missing_months}',
          '[]'::jsonb,
          true
        ),
        '{incomplete_months}',
        'false'::jsonb,
        true
      ),
      '{manual_review_required}',
      'true'::jsonb,
      true
    ),
    '{razon}',
    to_jsonb('Periodo bancario validado: el extracto cubre 28/04/2025-28/04/2026. Revisión manual requerida porque la extracción financiera automática tuvo baja confianza.'::text),
    true
  ),
  extracted_financials = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(extracted_financials, '{}'::jsonb),
        '{months_detected}',
        '["2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04"]'::jsonb,
        true
      ),
      '{missing_months}',
      '[]'::jsonb,
      true
    ),
    '{warnings}',
    '["Periodo bancario validado por lectura determinística del extracto: 28/04/2025-28/04/2026. La extracción financiera automática requiere revisión manual."]'::jsonb,
    true
  ),
  result = jsonb_set(
    COALESCE(result, '{}'::jsonb),
    '{ai_result,warnings}',
    '["Periodo bancario validado por lectura determinística del extracto: 28/04/2025-28/04/2026. La extracción financiera automática requiere revisión manual."]'::jsonb,
    true
  ),
  period_start = '2025-04-28',
  updated_at = now()
WHERE id = '1c8988a3-c8da-400a-9fec-b8a5b8447dde';