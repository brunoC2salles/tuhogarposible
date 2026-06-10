
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update standalone analysis to link lead" ON public.lead_document_analysis;
CREATE POLICY "Admins can update standalone analysis to link lead"
  ON public.lead_document_analysis
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Agents can manage services for their leads" ON public.lead_services;
CREATE POLICY "Agents can manage services for their leads"
  ON public.lead_services
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_services.lead_id
      AND (leads.agente_asignado_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_services.lead_id
      AND (leads.agente_asignado_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.user_role))
  ));

DROP POLICY IF EXISTS "Supervisores can view lead services" ON public.lead_services;
DROP POLICY IF EXISTS "Supervisors can view lead services" ON public.lead_services;
CREATE POLICY "Supervisors can view lead services"
  ON public.lead_services
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::public.user_role));

DROP POLICY IF EXISTS "Supervisors can view lead historico" ON public.lead_historico;
CREATE POLICY "Supervisors can view lead historico"
  ON public.lead_historico
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::public.user_role));

ALTER PUBLICATION supabase_realtime DROP TABLE public.lead_document_analysis;
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
