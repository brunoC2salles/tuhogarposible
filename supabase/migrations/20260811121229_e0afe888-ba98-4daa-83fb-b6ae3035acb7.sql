CREATE TABLE public.agent_assignment_boost (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remaining integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_assignment_boost TO authenticated;
GRANT ALL ON public.agent_assignment_boost TO service_role;

ALTER TABLE public.agent_assignment_boost ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assignment boosts"
ON public.agent_assignment_boost
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE INDEX idx_agent_assignment_boost_active ON public.agent_assignment_boost (expires_at, remaining);

CREATE TRIGGER update_agent_assignment_boost_updated_at
BEFORE UPDATE ON public.agent_assignment_boost
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();