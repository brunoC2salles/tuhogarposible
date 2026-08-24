CREATE TABLE public.bitrix_dispatches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.profiles(id),
  first_sent_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  send_count integer NOT NULL DEFAULT 1,
  last_kind text NOT NULL DEFAULT 'create',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bitrix_dispatches TO authenticated;
GRANT ALL ON public.bitrix_dispatches TO service_role;

ALTER TABLE public.bitrix_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bitrix dispatches"
ON public.bitrix_dispatches FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bitrix_dispatches_updated_at
BEFORE UPDATE ON public.bitrix_dispatches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bitrix_dispatches_agent ON public.bitrix_dispatches(agent_id);