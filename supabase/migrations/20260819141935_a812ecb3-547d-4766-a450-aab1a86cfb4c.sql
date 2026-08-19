CREATE OR REPLACE FUNCTION public.pick_next_agent_weighted(_candidates uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_n int;
BEGIN
  v_n := COALESCE(array_length(_candidates, 1), 0);
  IF v_n = 0 THEN
    RETURN NULL;
  END IF;

  -- 1) Acumular créditos según estrellas (peso muy suave: 1.0 .. 1.4)
  UPDATE public.profiles p
     SET assignment_credit = p.assignment_credit
       + (1 + (GREATEST(LEAST(COALESCE(p.estrellas, 3), 5), 1) - 1) * 0.1)
   WHERE p.id = ANY(_candidates);

  -- 2) Mínimo garantizado: agente que lleva más rondas de las debidas sin recibir lead
  SELECT p.id INTO v_id
    FROM public.profiles p
   WHERE p.id = ANY(_candidates)
     AND (
       p.last_assigned_at IS NULL
       OR (
         SELECT COUNT(*) FROM public.leads l
          WHERE l.agente_asignado_id IS NOT NULL
            AND l.created_at > p.last_assigned_at
       ) > v_n
     )
   ORDER BY p.last_assigned_at ASC NULLS FIRST, p.id
   LIMIT 1;

  -- 3) Si no hay hambruna, el de mayor crédito acumulado
  IF v_id IS NULL THEN
    SELECT p.id INTO v_id
      FROM public.profiles p
     WHERE p.id = ANY(_candidates)
     ORDER BY p.assignment_credit DESC, p.last_assigned_at ASC NULLS FIRST, p.id
     LIMIT 1;
  END IF;

  UPDATE public.profiles
     SET assignment_credit = assignment_credit - 1,
         last_assigned_at = now()
   WHERE id = v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pick_next_agent_weighted(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_next_agent_weighted(uuid[]) TO service_role;