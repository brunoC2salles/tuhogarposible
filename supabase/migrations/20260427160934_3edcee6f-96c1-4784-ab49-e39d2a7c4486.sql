ALTER TABLE public.lead_document_analysis
ALTER COLUMN analysis_provider SET DEFAULT 'internal';

CREATE OR REPLACE FUNCTION public.generate_document_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, (floor(random() * 62)::int) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_bewor_token_on_qualification()
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