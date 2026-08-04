CREATE OR REPLACE FUNCTION public.enforce_valid_reunion_datetime()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_local timestamp;
  v_dow int;
  v_hour int;
  v_min int;
  v_date date;
  v_guard int := 0;
  v_conflict boolean;
BEGIN
  IF NEW.reunion_datetime IS NULL THEN
    RETURN NEW;
  END IF;

  v_local := NEW.reunion_datetime AT TIME ZONE 'Europe/Madrid';

  -- 1) Fechas absurdas (epoch 1969, años lejanos) -> siguiente dia laborable 11:00
  IF v_local < timestamp '2025-01-01 00:00'
     OR v_local > (now() AT TIME ZONE 'Europe/Madrid') + interval '1 year' THEN
    v_local := date_trunc('day', (now() AT TIME ZONE 'Europe/Madrid') + interval '1 day') + interval '11 hours';
  END IF;

  v_date := v_local::date;
  v_hour := EXTRACT(hour FROM v_local)::int;
  v_min  := EXTRACT(minute FROM v_local)::int;

  -- 2) Franja laboral 08:00-20:00
  IF v_hour < 8 OR v_hour >= 20 THEN
    v_hour := 11;
    v_min := 0;
  END IF;

  -- 3) Fin de semana -> proximo lunes
  v_dow := EXTRACT(dow FROM v_date)::int;
  IF v_dow = 6 THEN
    v_date := v_date + 2;
  ELSIF v_dow = 0 THEN
    v_date := v_date + 1;
  END IF;

  -- 4) Evitar solapes de agente en reuniones futuras
  IF NEW.agente_asignado_id IS NOT NULL
     AND (v_date + make_time(v_hour, v_min, 0)) > (now() AT TIME ZONE 'Europe/Madrid') THEN
    LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.agente_asignado_id = NEW.agente_asignado_id
          AND l.id <> NEW.id
          AND l.reunion_datetime IS NOT NULL
          AND date_trunc('hour', l.reunion_datetime AT TIME ZONE 'Europe/Madrid')
              = date_trunc('hour', v_date + make_time(v_hour, v_min, 0))
      ) INTO v_conflict;

      EXIT WHEN NOT v_conflict OR v_guard > 60;

      v_guard := v_guard + 1;
      v_hour := v_hour + 1;
      IF v_hour >= 20 THEN
        v_hour := 9;
        v_date := v_date + 1;
        v_dow := EXTRACT(dow FROM v_date)::int;
        IF v_dow = 6 THEN v_date := v_date + 2;
        ELSIF v_dow = 0 THEN v_date := v_date + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 5) Escribir valores normalizados y sincronizar columnas derivadas
  NEW.reunion_datetime := (v_date + make_time(v_hour, v_min, 0)) AT TIME ZONE 'Europe/Madrid';
  NEW.fecha_reunion := v_date;
  NEW.hora_reunion := make_time(v_hour, v_min, 0);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_valid_reunion_datetime ON public.leads;
CREATE TRIGGER trg_enforce_valid_reunion_datetime
BEFORE INSERT OR UPDATE OF reunion_datetime, agente_asignado_id ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.enforce_valid_reunion_datetime();