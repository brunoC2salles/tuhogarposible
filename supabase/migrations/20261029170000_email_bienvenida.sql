-- 2026-10-29: email de bienvenida 24h después del alta del lead cualificado (escenario Make "Email bienvenida 24h").
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email_bienvenida_enviado_at timestamptz;

-- Solo leads creados a partir de la activación (no se envía a leads antiguos).
INSERT INTO public.admin_settings (key, value)
VALUES ('email_bienvenida_desde', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
ON CONFLICT (key) DO NOTHING;

-- El secreto (key email_bienvenida_secret) se guarda directamente en admin_settings, fuera del repositorio.
