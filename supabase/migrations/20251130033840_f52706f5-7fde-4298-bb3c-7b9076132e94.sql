-- Add new notification type for candidate stage changes
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'candidate_stage_change';

-- Create function to notify admins when candidate changes stage
CREATE OR REPLACE FUNCTION public.notify_candidate_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_stage_label TEXT;
  v_new_stage_label TEXT;
BEGIN
  -- Only notify if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Map stage values to readable labels
    v_old_stage_label := CASE OLD.stage
      WHEN 'nuevo_contacto' THEN 'Nuevo Contacto'
      WHEN 'mensaje_whatsapp' THEN 'Mensaje WhatsApp'
      WHEN 'primera_reunion' THEN 'Primera Reunión'
      WHEN 'segunda_reunion_presentacion' THEN 'Segunda Reunión y Presentación'
      WHEN 'reunion_dudas_albert' THEN 'Reunión de Dudas con Albert'
      WHEN 'dudas_contrato' THEN 'Dudas y Contrato'
      WHEN 'pago' THEN 'Pago'
      WHEN 'rellenar_perfil' THEN 'Rellenar Información de Perfil'
      WHEN 'cerrado' THEN 'Cerrado'
      ELSE OLD.stage::text
    END;
    
    v_new_stage_label := CASE NEW.stage
      WHEN 'nuevo_contacto' THEN 'Nuevo Contacto'
      WHEN 'mensaje_whatsapp' THEN 'Mensaje WhatsApp'
      WHEN 'primera_reunion' THEN 'Primera Reunión'
      WHEN 'segunda_reunion_presentacion' THEN 'Segunda Reunión y Presentación'
      WHEN 'reunion_dudas_albert' THEN 'Reunión de Dudas con Albert'
      WHEN 'dudas_contrato' THEN 'Dudas y Contrato'
      WHEN 'pago' THEN 'Pago'
      WHEN 'rellenar_perfil' THEN 'Rellenar Información de Perfil'
      WHEN 'cerrado' THEN 'Cerrado'
      ELSE NEW.stage::text
    END;
    
    -- Notify all admins
    PERFORM notify_admins(
      'candidate_stage_change'::notification_type,
      'Candidato Cambió de Etapa',
      'El candidato "' || NEW.nombre_completo || '" cambió de "' || v_old_stage_label || '" a "' || v_new_stage_label || '".',
      '/admin/reclutamiento',
      jsonb_build_object(
        'candidate_id', NEW.id,
        'candidate_name', NEW.nombre_completo,
        'old_stage', OLD.stage,
        'new_stage', NEW.stage
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for candidate stage changes
DROP TRIGGER IF EXISTS trigger_notify_candidate_stage_change ON agent_candidates;
CREATE TRIGGER trigger_notify_candidate_stage_change
  AFTER UPDATE ON agent_candidates
  FOR EACH ROW
  EXECUTE FUNCTION notify_candidate_stage_change();