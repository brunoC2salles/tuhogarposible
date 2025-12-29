-- Primeiro atualizar a função de log para permitir migrações sem auth.uid()
CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changed_by uuid;
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Tentar usar auth.uid(), se não disponível usar um valor do sistema
    BEGIN
      v_changed_by := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_changed_by := NULL;
    END;
    
    -- Só criar histórico se tiver um usuário (ignorar migrações em batch)
    IF v_changed_by IS NOT NULL THEN
      INSERT INTO public.lead_historico (lead_id, stage_anterior, stage_nuevo, changed_by)
      VALUES (NEW.id, OLD.stage, NEW.stage, v_changed_by);
    END IF;
    
    NEW.last_stage_change_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;