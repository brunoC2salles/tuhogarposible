
-- Limpiar referencias y eliminar agentes Jose María Hernández de la Cruz y Tulia Savulov
UPDATE public.leads SET agente_asignado_id = NULL 
WHERE agente_asignado_id IN ('cd49f1d6-0efe-400e-a989-6f111601db71','669d1db7-92e9-42ee-9c11-3d35e5b6df56');

UPDATE public.product_invoices SET agent_id = NULL 
WHERE agent_id IN ('cd49f1d6-0efe-400e-a989-6f111601db71','669d1db7-92e9-42ee-9c11-3d35e5b6df56');

UPDATE public.agent_assignment_tracking SET last_assigned_agent_id = NULL 
WHERE last_assigned_agent_id IN ('cd49f1d6-0efe-400e-a989-6f111601db71','669d1db7-92e9-42ee-9c11-3d35e5b6df56');

DELETE FROM public.user_roles 
WHERE user_id IN ('cd49f1d6-0efe-400e-a989-6f111601db71','669d1db7-92e9-42ee-9c11-3d35e5b6df56');

DELETE FROM public.profiles 
WHERE id IN ('cd49f1d6-0efe-400e-a989-6f111601db71','669d1db7-92e9-42ee-9c11-3d35e5b6df56');

DELETE FROM auth.users 
WHERE id IN ('cd49f1d6-0efe-400e-a989-6f111601db71','669d1db7-92e9-42ee-9c11-3d35e5b6df56');
