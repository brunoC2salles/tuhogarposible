-- Habilitar Realtime para tabela notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Criar trigger para notificar reatribuição de leads
CREATE OR REPLACE FUNCTION notify_lead_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_old_agent_name TEXT;
  v_new_agent_name TEXT;
BEGIN
  -- Detectar reatribuição (mudança de agente)
  IF OLD.agente_asignado_id IS DISTINCT FROM NEW.agente_asignado_id THEN
    -- Buscar nome do agente anterior
    IF OLD.agente_asignado_id IS NOT NULL THEN
      SELECT nombre INTO v_old_agent_name
      FROM profiles
      WHERE id = OLD.agente_asignado_id;
      
      -- Notificar agente anterior
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        OLD.agente_asignado_id,
        'new_lead',
        'Lead Reasignado',
        'El lead "' || NEW.nombre_completo || '" ha sido reasignado a otro agente.',
        '/agente/crm',
        jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nombre_completo)
      );
    END IF;
    
    -- Buscar nome do novo agente
    IF NEW.agente_asignado_id IS NOT NULL THEN
      SELECT nombre INTO v_new_agent_name
      FROM profiles
      WHERE id = NEW.agente_asignado_id;
      
      -- Notificar novo agente
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        NEW.agente_asignado_id,
        'new_lead',
        'Nuevo Lead Asignado',
        'El lead "' || NEW.nombre_completo || '" ha sido asignado a ti.',
        '/agente/crm',
        jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nombre_completo)
      );
    END IF;
    
    -- Notificar admins
    PERFORM notify_admins(
      'new_lead',
      'Lead Reasignado',
      'El lead "' || NEW.nombre_completo || '" ha sido reasignado de ' || 
      COALESCE(v_old_agent_name, 'sin asignar') || ' a ' || 
      COALESCE(v_new_agent_name, 'sin asignar') || '.',
      '/admin/crm',
      jsonb_build_object(
        'lead_id', NEW.id, 
        'lead_name', NEW.nombre_completo,
        'old_agent', v_old_agent_name,
        'new_agent', v_new_agent_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para reatribuição
DROP TRIGGER IF EXISTS notify_lead_reassignment_trigger ON leads;
CREATE TRIGGER notify_lead_reassignment_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_reassignment();