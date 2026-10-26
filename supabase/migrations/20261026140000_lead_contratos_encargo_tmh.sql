-- Encargo de Servicio de Tu Mejor Hipoteca (26/10/2026): el mismo enlace del mandato de compra genera
-- también el encargo TMH, con su propia solicitud de firma en Lumin y su PDF firmado guardado en el lead.
ALTER TABLE public.lead_contratos
  ADD COLUMN IF NOT EXISTS tmh_pdf_path text,
  ADD COLUMN IF NOT EXISTS tmh_lumin_request_id text,
  ADD COLUMN IF NOT EXISTS tmh_lumin_status text,
  ADD COLUMN IF NOT EXISTS tmh_firmado_path text,
  ADD COLUMN IF NOT EXISTS tmh_firmado_at timestamptz;

-- El webhook de Lumin busca el contrato por cualquiera de los dos ids de solicitud
CREATE INDEX IF NOT EXISTS lead_contratos_tmh_lumin_request_id_idx
  ON public.lead_contratos (tmh_lumin_request_id)
  WHERE tmh_lumin_request_id IS NOT NULL;
