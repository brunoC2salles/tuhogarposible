-- Adicionar campos para tracking de automação
ALTER TABLE form_partial_submissions
ADD COLUMN automation_triggered BOOLEAN DEFAULT FALSE,
ADD COLUMN automation_triggered_at TIMESTAMP WITH TIME ZONE;

-- Criar função para trigger de webhook automático
CREATE OR REPLACE FUNCTION notify_form_abandonment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Só dispara se mudou para abandoned=true e automação ainda não foi disparada
  IF NEW.abandoned = true AND OLD.abandoned = false AND NEW.automation_triggered = false THEN
    -- Chamar edge function via pg_net
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/trigger-abandonment-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body := jsonb_build_object(
          'abandonment_id', NEW.id
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS on_form_abandoned ON form_partial_submissions;
CREATE TRIGGER on_form_abandoned
  AFTER UPDATE ON form_partial_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_form_abandonment();

COMMENT ON FUNCTION notify_form_abandonment IS 'Dispara webhook automáticamente cuando un formulario es abandonado';