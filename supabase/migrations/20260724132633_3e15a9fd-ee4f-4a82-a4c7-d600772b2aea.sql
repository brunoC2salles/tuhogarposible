
-- 1. Drop columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS tidycal_url,
  DROP COLUMN IF EXISTS dni_nie,
  DROP COLUMN IF EXISTS comision_porcentaje,
  DROP COLUMN IF EXISTS region_round_robin,
  DROP COLUMN IF EXISTS disponibilidad;

-- 2. Create agent_availability
CREATE TABLE public.agent_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Monday..6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_availability_time_valid CHECK (end_time > start_time)
);

CREATE INDEX idx_agent_availability_agent ON public.agent_availability(agent_id);
CREATE INDEX idx_agent_availability_weekday ON public.agent_availability(weekday);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_availability TO authenticated;
GRANT ALL ON public.agent_availability TO service_role;

ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own availability"
  ON public.agent_availability FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Agents can insert own availability"
  ON public.agent_availability FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Agents can update own availability"
  ON public.agent_availability FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Agents can delete own availability"
  ON public.agent_availability FOR DELETE TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TRIGGER update_agent_availability_updated_at
  BEFORE UPDATE ON public.agent_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Reset round-robin tracking to a single global cursor
DELETE FROM public.agent_assignment_tracking;
