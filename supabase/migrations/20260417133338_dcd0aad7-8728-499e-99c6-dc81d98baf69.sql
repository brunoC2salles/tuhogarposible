-- 1) Tornar lead_id opcional em ambas tabelas
ALTER TABLE public.lead_document_tokens ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE public.lead_document_analysis ALTER COLUMN lead_id DROP NOT NULL;

-- 2) Políticas adicionais para tokens standalone (lead_id IS NULL)
CREATE POLICY "Admins and agents can create standalone tokens"
ON public.lead_document_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  lead_id IS NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'agente'::user_role) OR
    has_role(auth.uid(), 'supervisor'::user_role)
  )
);

CREATE POLICY "Admins and agents can view standalone tokens"
ON public.lead_document_tokens
FOR SELECT
TO authenticated
USING (
  lead_id IS NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'agente'::user_role) OR
    has_role(auth.uid(), 'supervisor'::user_role)
  )
);

CREATE POLICY "Admins can delete standalone tokens"
ON public.lead_document_tokens
FOR DELETE
TO authenticated
USING (
  lead_id IS NULL AND has_role(auth.uid(), 'admin'::user_role)
);

-- 3) Políticas para análises standalone
CREATE POLICY "Admins and agents can view standalone analysis"
ON public.lead_document_analysis
FOR SELECT
TO authenticated
USING (
  lead_id IS NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'agente'::user_role) OR
    has_role(auth.uid(), 'supervisor'::user_role)
  )
);

CREATE POLICY "Admins can update standalone analysis to link lead"
ON public.lead_document_analysis
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'agente'::user_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'agente'::user_role)
);

-- 4) Função para gerar token aleatório (32 chars alfanuméricos)
CREATE OR REPLACE FUNCTION public.generate_bewor_token()
RETURNS text
LANGUAGE plpgsql
VOLATILE
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

-- 5) Trigger: gerar token automaticamente quando lead muda para 'lead_cualificado'
CREATE OR REPLACE FUNCTION public.auto_generate_bewor_token_on_qualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_token uuid;
BEGIN
  -- Só atua quando o stage muda PARA 'lead_cualificado'
  IF NEW.stage = 'lead_cualificado'::lead_stage 
     AND (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    
    -- Verificar se já tem um token ativo (não expirado)
    SELECT id INTO v_existing_token
    FROM public.lead_document_tokens
    WHERE lead_id = NEW.id
      AND expires_at > now()
    LIMIT 1;
    
    -- Só cria se não existir token ativo
    IF v_existing_token IS NULL THEN
      INSERT INTO public.lead_document_tokens (lead_id, token, created_by, expires_at)
      VALUES (NEW.id, public.generate_bewor_token(), NEW.agente_asignado_id, now() + interval '7 days');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_bewor_token ON public.leads;
CREATE TRIGGER trg_auto_generate_bewor_token
AFTER UPDATE OF stage ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_bewor_token_on_qualification();