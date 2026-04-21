UPDATE public.leads
SET stage = 'nuevo_lead'::lead_stage,
    agente_asignado_id = '669d1db7-92e9-42ee-9c11-3d35e5b6df56',
    notas = COALESCE(notas, '') || E'\n\n[RECUPERADO 2026-04-21] Re-cualificado por nueva regla de ahorros (declaró: Si,10 mil €). Asignado a Jose María Hernández (Comunidad Valenciana).'
WHERE id = 'c84be188-5d58-48da-ac12-bd0879ffbde4';

UPDATE public.leads
SET stage = 'nuevo_lead'::lead_stage,
    agente_asignado_id = '669d1db7-92e9-42ee-9c11-3d35e5b6df56',
    notas = COALESCE(notas, '') || E'\n\n[RECUPERADO 2026-04-21] Re-cualificado por nueva regla de ahorros (declaró: impuestos pagados). Asignado a Jose María Hernández (Castilla-La Mancha).'
WHERE id = '5a7fb9f1-6d0b-4c1c-9c1d-b052afeb129e';