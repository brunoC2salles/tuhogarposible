
-- 1) Tabela de fila de recordatorios
CREATE TABLE public.lead_reuniones_recordatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  reunion_datetime timestamptz NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('24h','1h')),
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at timestamptz,
  canal text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lead_reuniones_recordatorios TO authenticated;
GRANT ALL ON public.lead_reuniones_recordatorios TO service_role;

ALTER TABLE public.lead_reuniones_recordatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all reminders"
  ON public.lead_reuniones_recordatorios FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agente reads own lead reminders"
  ON public.lead_reuniones_recordatorios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_reuniones_recordatorios.lead_id
        AND l.agente_asignado_id = auth.uid()
    )
  );

CREATE INDEX idx_reuniones_recordatorios_pending
  ON public.lead_reuniones_recordatorios (scheduled_for)
  WHERE status = 'pending';

CREATE INDEX idx_reuniones_recordatorios_lead
  ON public.lead_reuniones_recordatorios (lead_id);

CREATE TRIGGER trg_reuniones_recordatorios_updated_at
  BEFORE UPDATE ON public.lead_reuniones_recordatorios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Trigger no leads para gerar/regenerar recordatorios
CREATE OR REPLACE FUNCTION public.sync_lead_reunion_recordatorios()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reunion timestamptz;
  v_sched_24 timestamptz;
  v_sched_1 timestamptz;
BEGIN
  -- Só reage quando reunion_datetime muda (ou no INSERT)
  IF TG_OP = 'UPDATE' AND OLD.reunion_datetime IS NOT DISTINCT FROM NEW.reunion_datetime THEN
    RETURN NEW;
  END IF;

  -- Cancela pendentes antigos
  UPDATE public.lead_reuniones_recordatorios
    SET status = 'cancelled', updated_at = now()
  WHERE lead_id = NEW.id AND status = 'pending';

  IF NEW.reunion_datetime IS NULL THEN
    RETURN NEW;
  END IF;

  v_reunion := NEW.reunion_datetime;
  v_sched_24 := v_reunion - interval '24 hours';
  v_sched_1  := v_reunion - interval '1 hour';

  INSERT INTO public.lead_reuniones_recordatorios (lead_id, reunion_datetime, tipo, scheduled_for, status)
  VALUES (
    NEW.id, v_reunion, '24h', v_sched_24,
    CASE WHEN v_sched_24 < now() THEN 'cancelled' ELSE 'pending' END
  );

  INSERT INTO public.lead_reuniones_recordatorios (lead_id, reunion_datetime, tipo, scheduled_for, status)
  VALUES (
    NEW.id, v_reunion, '1h', v_sched_1,
    CASE WHEN v_sched_1 < now() THEN 'cancelled' ELSE 'pending' END
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_lead_reunion_recordatorios
  AFTER INSERT OR UPDATE OF reunion_datetime ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_reunion_recordatorios();

-- 3) Cron: roda a edge function a cada 5 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'send-reunion-reminders-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/send-reunion-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuemdwemFibHdmcHRhZ2ZibnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDMzMDIsImV4cCI6MjA3MzYxOTMwMn0.s1IIGpfIrufl4Bik6PODOKm11W7aKNkvhiagCteFYbc"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
