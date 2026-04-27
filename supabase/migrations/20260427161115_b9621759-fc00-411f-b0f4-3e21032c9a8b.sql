CREATE OR REPLACE FUNCTION public.auto_generate_document_token_on_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_token uuid;
BEGIN
  IF NEW.stage = 'lead_cualificado'::lead_stage 
     AND (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    
    SELECT id INTO v_existing_token
    FROM public.lead_document_tokens
    WHERE lead_id = NEW.id
      AND expires_at > now()
    LIMIT 1;
    
    IF v_existing_token IS NULL THEN
      INSERT INTO public.lead_document_tokens (lead_id, token, created_by, expires_at)
      VALUES (NEW.id, public.generate_document_token(), NEW.agente_asignado_id, now() + interval '7 days');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_bewor_token ON public.leads;
DROP TRIGGER IF EXISTS trg_auto_generate_document_token ON public.leads;

CREATE TRIGGER trg_auto_generate_document_token
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_document_token_on_qualification();

DROP FUNCTION IF EXISTS public.auto_generate_bewor_token_on_qualification();
DROP FUNCTION IF EXISTS public.generate_bewor_token();