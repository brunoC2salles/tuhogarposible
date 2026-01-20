-- Mover leads com nota de descualificação para a coluna correta
UPDATE leads
SET stage = 'no_cualificado',
    updated_at = now()
WHERE stage != 'no_cualificado'
  AND (
    notas ILIKE '%❌ NO CUALIFICADO%' 
    OR notas ILIKE '%⚠️ PENDENTE%'
    OR notas ILIKE '%PENDIENTE%'
  );