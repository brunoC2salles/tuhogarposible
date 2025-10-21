-- Add new columns to form_submissions for lead qualification form
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS en_fichero_morosidad BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compra_solo_acompanado TEXT CHECK (compra_solo_acompanado IN ('solo', 'acompanado')),
  ADD COLUMN IF NOT EXISTS acompanante_nombre TEXT,
  ADD COLUMN IF NOT EXISTS acompanante_relacion TEXT,
  ADD COLUMN IF NOT EXISTS acompanante_aporte NUMERIC,
  ADD COLUMN IF NOT EXISTS qualificado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS razon_no_qualificado TEXT,
  ADD COLUMN IF NOT EXISTS acepta_privacidad BOOLEAN NOT NULL DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN form_submissions.compra_solo_acompanado IS 'Solo ou Acompanado';
COMMENT ON COLUMN form_submissions.acompanante_aporte IS 'Aporte mensal do acompanhante em euros';
COMMENT ON COLUMN form_submissions.en_fichero_morosidad IS 'Se está en fichero de morosidad';
COMMENT ON COLUMN form_submissions.qualificado IS 'Se o lead passou nos critérios de qualificação';
COMMENT ON COLUMN form_submissions.razon_no_qualificado IS 'Razão pela qual o lead não foi qualificado';
COMMENT ON COLUMN form_submissions.acepta_privacidad IS 'Aceita política de privacidade RGPD';