-- Create storage bucket for lead documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-documents',
  'lead-documents',
  false,
  5242880, -- 5MB in bytes
  ARRAY['application/pdf']
);

-- RLS Policies for lead-documents bucket
-- Agents can view documents of their assigned leads
CREATE POLICY "Agents can view documents of their leads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lead-documents' AND
  (
    has_role(auth.uid(), 'admin'::user_role) OR
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id::text = (storage.foldername(name))[1]
      AND leads.agente_asignado_id = auth.uid()
    )
  )
);

-- Agents can upload documents to their assigned leads
CREATE POLICY "Agents can upload documents to their leads"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lead-documents' AND
  (
    has_role(auth.uid(), 'admin'::user_role) OR
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id::text = (storage.foldername(name))[1]
      AND leads.agente_asignado_id = auth.uid()
    )
  )
);

-- Agents can delete documents from their assigned leads
CREATE POLICY "Agents can delete documents from their leads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lead-documents' AND
  (
    has_role(auth.uid(), 'admin'::user_role) OR
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id::text = (storage.foldername(name))[1]
      AND leads.agente_asignado_id = auth.uid()
    )
  )
);

-- Create new lead_stage enum with updated stages
CREATE TYPE lead_stage_new AS ENUM (
  'lead_cualificado',
  'mensaje_whatsapp',
  'primera_llamada',
  'reunion_contrato',
  'firma_pago',
  'listo'
);

-- Add temporary column with new type
ALTER TABLE leads ADD COLUMN stage_new lead_stage_new;

-- Map old stages to new stages
UPDATE leads SET stage_new = CASE
  WHEN stage = 'nuevo_lead' THEN 'lead_cualificado'::lead_stage_new
  WHEN stage = 'primera_llamada' THEN 'mensaje_whatsapp'::lead_stage_new
  WHEN stage = 'visita_agendada' THEN 'primera_llamada'::lead_stage_new
  WHEN stage = 'acuerdo' THEN 'reunion_contrato'::lead_stage_new
  WHEN stage = 'listo' THEN 'listo'::lead_stage_new
  ELSE 'lead_cualificado'::lead_stage_new
END;

-- Drop old column and rename new one
ALTER TABLE leads DROP COLUMN stage;
ALTER TABLE leads RENAME COLUMN stage_new TO stage;
ALTER TABLE leads ALTER COLUMN stage SET NOT NULL;
ALTER TABLE leads ALTER COLUMN stage SET DEFAULT 'lead_cualificado'::lead_stage_new;

-- Update lead_historico table
ALTER TABLE lead_historico ADD COLUMN stage_anterior_new lead_stage_new;
ALTER TABLE lead_historico ADD COLUMN stage_nuevo_new lead_stage_new;

UPDATE lead_historico SET stage_anterior_new = CASE
  WHEN stage_anterior = 'nuevo_lead' THEN 'lead_cualificado'::lead_stage_new
  WHEN stage_anterior = 'primera_llamada' THEN 'mensaje_whatsapp'::lead_stage_new
  WHEN stage_anterior = 'visita_agendada' THEN 'primera_llamada'::lead_stage_new
  WHEN stage_anterior = 'acuerdo' THEN 'reunion_contrato'::lead_stage_new
  WHEN stage_anterior = 'listo' THEN 'listo'::lead_stage_new
  ELSE NULL
END;

UPDATE lead_historico SET stage_nuevo_new = CASE
  WHEN stage_nuevo = 'nuevo_lead' THEN 'lead_cualificado'::lead_stage_new
  WHEN stage_nuevo = 'primera_llamada' THEN 'mensaje_whatsapp'::lead_stage_new
  WHEN stage_nuevo = 'visita_agendada' THEN 'primera_llamada'::lead_stage_new
  WHEN stage_nuevo = 'acuerdo' THEN 'reunion_contrato'::lead_stage_new
  WHEN stage_nuevo = 'listo' THEN 'listo'::lead_stage_new
  ELSE 'lead_cualificado'::lead_stage_new
END;

ALTER TABLE lead_historico DROP COLUMN stage_anterior;
ALTER TABLE lead_historico DROP COLUMN stage_nuevo;
ALTER TABLE lead_historico RENAME COLUMN stage_anterior_new TO stage_anterior;
ALTER TABLE lead_historico RENAME COLUMN stage_nuevo_new TO stage_nuevo;
ALTER TABLE lead_historico ALTER COLUMN stage_nuevo SET NOT NULL;

-- Drop old enum and rename new one
DROP TYPE lead_stage;
ALTER TYPE lead_stage_new RENAME TO lead_stage;

-- Recreate the trigger function (it was dropped with the enum)
CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.lead_historico (lead_id, stage_anterior, stage_nuevo, changed_by)
    VALUES (NEW.id, OLD.stage, NEW.stage, auth.uid());
    
    NEW.last_stage_change_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_lead_stage_change ON leads;
CREATE TRIGGER on_lead_stage_change
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION log_lead_stage_change();