INSERT INTO public.agent_assignment_boost (agent_id, remaining, expires_at, mode, next_is_boost)
VALUES (
  '1181619d-a00d-41f2-b551-7bbd13ac2ef8',
  4,
  ((now() AT TIME ZONE 'Europe/Madrid')::date + time '23:59') AT TIME ZONE 'Europe/Madrid',
  'consecutive',
  true
);