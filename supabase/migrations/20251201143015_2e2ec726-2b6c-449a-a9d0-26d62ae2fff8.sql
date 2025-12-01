-- ============================================
-- PARTE 2: TRIGGER E RLS POLICIES
-- ============================================

-- 1. Atualizar trigger handle_new_user para reconhecer supervisores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_role public.user_role;
BEGIN
  -- Verificar admin
  IF NEW.email = 'tuhogarposible.contacto@gmail.com' THEN
    new_role := 'admin'::public.user_role;
  -- Verificar supervisores
  ELSIF NEW.email IN ('juan.benavides@gibobs.com', 'jaime.aguirre@gibobs.com') THEN
    new_role := 'supervisor'::public.user_role;
  ELSE
    new_role := 'agente'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, nombre, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', split_part(NEW.email, '@', 1)),
    new_role
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role);

  RETURN NEW;
END;
$$;

-- 2. RLS policies para supervisor ver e editar todos os leads
CREATE POLICY "Supervisores can view all leads"
ON public.leads FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisores can update all leads"
ON public.leads FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'supervisor'));

-- 3. Supervisores podem ver suas próprias faturas e comissões
CREATE POLICY "Supervisores can view their own invoices"
ON public.product_invoices FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'supervisor') AND agent_id = auth.uid());

CREATE POLICY "Supervisores can view their own faturacoes"
ON public.faturacoes FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'supervisor') AND agente_id = auth.uid());