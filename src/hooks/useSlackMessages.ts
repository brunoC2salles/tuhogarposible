import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SlackMessage {
  ts: string;
  text: string;
  user: string;
}

export const useSlackMessages = () => {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('slack-api', {
        body: { action: 'get_messages' }
      });

      if (error) throw error;

      if (data?.success && data?.messages) {
        setMessages(data.messages);
      }
    } catch (error: any) {
      console.error('Error fetching Slack messages:', error);
      toast.error('Error al cargar mensajes de Slack');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    try {
      setSending(true);
      const { data, error } = await supabase.functions.invoke('slack-api', {
        body: { 
          action: 'send_message',
          text 
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Mensaje enviado');
        await fetchMessages(); // Refresh messages
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Error sending Slack message:', error);
      toast.error('Error al enviar mensaje');
      return false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refreshMessages: fetchMessages
  };
};