UPDATE public.leads
SET stage = 'nuevo_lead',
    agente_asignado_id = '56f802e5-cdc4-4369-89cc-4ac7e3238ba5',
    notas = replace(notas, 'NO CUALIFICADO - Ingresos insuficientes (menos de 1300€)', 'CUALIFICADO (re-clasificado tras corrección del parser de ingresos: 2.500€ - 4.000€ → 3250€)')
WHERE id = '624e212d-7d0e-46d1-be73-9b3f3d545407';