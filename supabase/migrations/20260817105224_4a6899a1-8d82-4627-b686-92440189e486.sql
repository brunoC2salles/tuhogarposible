ALTER TABLE public.agent_assignment_boost
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'consecutive',
  ADD COLUMN IF NOT EXISTS next_is_boost boolean NOT NULL DEFAULT true;

INSERT INTO public.agent_assignment_boost (agent_id, remaining, expires_at, mode, next_is_boost)
VALUES (
  'e97d13f9-1d76-44da-9e6e-e1699110caee',
  5,
  (date_trunc('day', (now() AT TIME ZONE 'Europe/Madrid')) + interval '23 hours 59 minutes') AT TIME ZONE 'Europe/Madrid',
  'alternate',
  true
);