ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS fecha_reunion DATE,
  ADD COLUMN IF NOT EXISTS hora_reunion TIME,
  ADD COLUMN IF NOT EXISTS zona_horaria_reunion TEXT DEFAULT 'Europe/Madrid',
  ADD COLUMN IF NOT EXISTS reunion_datetime TIMESTAMPTZ;

DELETE FROM public.admin_settings WHERE key = 'webhook_disqualified_url';