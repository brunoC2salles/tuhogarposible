import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  user?: {
    id: string;
    nombre: string;
  };
}

export const useMessages = (channelId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelId || !user) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            user:profiles!chat_messages_user_id_fkey(id, nombre)
          `)
          .eq('channel_id', channelId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        toast.error('Error al cargar mensajes');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Setup realtime subscription
    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          // Fetch user data for new message
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, nombre')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage: Message = {
            ...payload.new as Message,
            user: userData || undefined
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [channelId, user]);

  const sendMessage = async (content: string, fileUrl?: string, fileName?: string) => {
    if (!user || !channelId) return { error: new Error('No user or channel') };

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content,
          file_url: fileUrl,
          file_name: fileName
        });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
      return { error };
    }
  };

  const uploadFile = async (file: File) => {
    if (!user || !channelId) return { url: null, error: new Error('No user or channel') };

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      return { url: publicUrl, error: null };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir archivo');
      return { url: null, error };
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    uploadFile
  };
};