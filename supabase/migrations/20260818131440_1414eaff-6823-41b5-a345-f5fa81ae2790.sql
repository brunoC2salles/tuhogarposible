-- Eliminar boosts anteriores del agente Jaime Fernández para evitar conflictos
DELETE FROM public.agent_assignment_boost
WHERE agent_id = 'e97d13f9-1d76-44da-9e6e-e1699110caee';

-- Insertar boost alterno fresco para hoy: 3 leads, expira a las 23:59 de Madrid
INSERT INTO public.agent_assignment_boost (
  agent_id,
  remaining,
  expires_at,
  mode,
  next_is_boost
) VALUES (
  'e97d13f9-1d76-44da-9e6e-e1699110caee',
  3,
  '2026-08-18T21:59:00Z', -- 23:59 Europe/Madrid (UTC+2 en agosto)
  'alternate',
  true
);