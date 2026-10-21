-- Visita agendada (21/10/2026): marca manual del agente/admin en Buscando Vivienda.
-- Aplicada en producción vía Supabase el 21/10/2026; este archivo es el registro en el repo.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS visita_agendada boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.log_visita_agendada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_changed_by uuid;
  v_nota text;
BEGIN
  -- La marca solo existe en Buscando Vivienda; al salir de la etapa se quita.
  IF NEW.visita_agendada AND NEW.stage IS DISTINCT FROM 'buscando_vivienda'::lead_stage THEN
    NEW.visita_agendada := false;
  END IF;

  IF OLD.visita_agendada IS DISTINCT FROM NEW.visita_agendada THEN
    IF NEW.visita_agendada THEN
      v_nota := 'Visita agendada marcada';
    ELSIF OLD.stage IS DISTINCT FROM NEW.stage THEN
      v_nota := 'Visita agendada retirada al salir de Buscando Vivienda';
    ELSE
      v_nota := 'Visita agendada desmarcada';
    END IF;

    BEGIN
      v_changed_by := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_changed_by := NULL;
    END;
    v_changed_by := COALESCE(v_changed_by, NEW.agente_asignado_id);

    -- lead_historico exige changed_by: sin usuario ni agente asignado no se registra.
    IF v_changed_by IS NOT NULL THEN
      INSERT INTO public.lead_historico (lead_id, stage_anterior, stage_nuevo, changed_by, notas)
      VALUES (NEW.id, NEW.stage, NEW.stage, v_changed_by, v_nota);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER trg_visita_agendada
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_visita_agendada();
