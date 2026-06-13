UPDATE public.leads
SET stage = 'nuevo_lead',
    notas = COALESCE(notas, '') || E'\n[Sistema] Reclassificado a nuevo_lead tras corrección del parser de ahorros (range 25.000€ - 50.000€ ahora interpretado como 37.500€).'
WHERE id = '62b08a55-a33d-488a-a518-a6ba83b2b09b'
  AND stage = 'descualificados';