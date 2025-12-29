-- Atualizar a função notify_lead_listo para usar o novo stage final do pipeline
-- Como não temos mais "listo", vamos notificar quando chegar em "cobro" (pronto para cobrar)
CREATE OR REPLACE FUNCTION public.notify_lead_listo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notificar quando o lead chega ao estágio de cobro
  IF OLD.stage IS DISTINCT FROM NEW.stage AND NEW.stage = 'cobro' THEN
    -- Notificar todos os admins
    PERFORM notify_admins(
      'lead_stage_listo',
      'Lead Listo para Cobro',
      'El lead "' || NEW.nombre_completo || '" ha llegado al estágio "Cobro" y está listo para revisión.',
      '/admin/crm',
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nombre_completo)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;