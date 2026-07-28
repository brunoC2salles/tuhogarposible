CREATE TABLE public.lead_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  fecha_visita TIMESTAMPTZ NOT NULL,
  product_urls TEXT[] NOT NULL DEFAULT '{}',
  tiene_reserva BOOLEAN NOT NULL DEFAULT false,
  reserva_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_visits_agente ON public.lead_visits(agente_id);
CREATE INDEX idx_lead_visits_lead ON public.lead_visits(lead_id);
CREATE INDEX idx_lead_visits_fecha ON public.lead_visits(fecha_visita DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_visits TO authenticated;
GRANT ALL ON public.lead_visits TO service_role;

ALTER TABLE public.lead_visits ENABLE ROW LEVEL SECURITY;

-- Agents: own visits
CREATE POLICY "Agents view own visits"
ON public.lead_visits FOR SELECT
TO authenticated
USING (
  agente_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
  OR public.has_role(auth.uid(), 'supervisor'::public.user_role)
);

CREATE POLICY "Agents insert own visits"
ON public.lead_visits FOR INSERT
TO authenticated
WITH CHECK (
  agente_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
);

CREATE POLICY "Agents update own visits"
ON public.lead_visits FOR UPDATE
TO authenticated
USING (
  agente_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
)
WITH CHECK (
  agente_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
);

CREATE POLICY "Agents delete own visits"
ON public.lead_visits FOR DELETE
TO authenticated
USING (
  agente_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
);

CREATE TRIGGER update_lead_visits_updated_at
BEFORE UPDATE ON public.lead_visits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();