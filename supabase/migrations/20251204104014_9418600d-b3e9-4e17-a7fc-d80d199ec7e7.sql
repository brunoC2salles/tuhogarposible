-- Adicionar novo tipo de notificação
ALTER TYPE notification_type ADD VALUE 'new_message';

-- Criar função para notificar membros do canal
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_name TEXT;
  v_channel_name TEXT;
  v_member RECORD;
BEGIN
  -- Buscar nome do remetente
  SELECT nombre INTO v_sender_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Buscar nome do canal
  SELECT name INTO v_channel_name
  FROM chat_channels WHERE id = NEW.channel_id;
  
  -- Notificar todos os membros do canal, exceto o remetente
  FOR v_member IN 
    SELECT user_id FROM chat_channel_members 
    WHERE channel_id = NEW.channel_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_member.user_id,
      'new_message',
      'Nuevo mensaje en ' || v_channel_name,
      COALESCE(v_sender_name, 'Alguien') || ': ' || 
        CASE WHEN NEW.content IS NOT NULL 
          THEN LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
          ELSE '📎 Archivo adjunto'
        END,
      '/chat',
      jsonb_build_object('channel_id', NEW.channel_id, 'message_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER trigger_notify_chat_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION notify_chat_message();