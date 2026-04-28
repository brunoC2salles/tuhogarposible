UPDATE public.lead_document_analysis
SET
  months_detected = 13,
  missing_months = '[]'::jsonb,
  manual_review_required = true,
  viabilidade_sugerida = COALESCE(viabilidade_sugerida, '{}'::jsonb)
    || '{"months_detected":13,"missing_months":[],"incomplete_months":false,"needs_manual_review":true,"period_validated":true,"razon":"Documento válido con 12 meses completos: el extracto CaixaBank cubre 28/04/2025 a 28/04/2026. Revisión manual requerida porque la extracción financiera automática no obtuvo ingresos con suficiente confianza."}'::jsonb,
  updated_at = now()
WHERE tipo = 'movimientos_bancarios'
  AND status = 'FINISHED'
  AND months_detected = 0
  AND created_at >= now() - interval '2 days'
  AND analysis_input->'files'->0->>'name' ILIKE 'DOC-20260428-WA0000_260428_065122%'
  AND COALESCE((analysis_input->'files'->0->>'pages')::int, 0) >= 39;