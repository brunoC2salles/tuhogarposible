import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_direct: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
}

export const useChannels = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar canais que o usuário é membro
      const { data: memberData, error: memberError } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const channelIds = memberData.map(m => m.channel_id);

      if (channelIds.length === 0) {
        setChannels([]);
        return;
      }

      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error: any) {
      console.error('Error fetching channels:', error);
      toast.error('Error al cargar canales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [user]);

  const createChannel = async (name: string, description?: string, memberIds?: string[]) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Crear canal
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          name,
          description,
          is_direct: false,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Adicionar membros
      const members = memberIds || [];
      if (!members.includes(user.id)) {
        members.push(user.id);
      }

      const { error: memberError } = await supabase
        .from('chat_channel_members')
        .insert(members.map(userId => ({
          channel_id: channel.id,
          user_id: userId
        })));

      if (memberError) throw memberError;

      toast.success('Canal creado exitosamente');
      await fetchChannels();
      return { data: channel, error: null };
    } catch (error: any) {
      console.error('Error creating channel:', error);
      toast.error('Error al crear canal');
      return { data: null, error };
    }
  };

  const joinChannel = async (channelId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('chat_channel_members')
        .insert({
          channel_id: channelId,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Unido al canal');
      await fetchChannels();
      return { error: null };
    } catch (error: any) {
      console.error('Error joining channel:', error);
      toast.error('Error al unirse al canal');
      return { error };
    }
  };

  const createDirectChannel = async (otherUserId: string, otherUserName: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Verificar si ya existe un canal directo entre estos usuarios
      const { data: existingMembers } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .in('user_id', [user.id, otherUserId]);

      if (existingMembers && existingMembers.length > 0) {
        // Buscar channel_id que aparece 2 vezes (ambos users são membros)
        const channelCounts = existingMembers.reduce((acc, member) => {
          acc[member.channel_id] = (acc[member.channel_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const existingChannelId = Object.keys(channelCounts).find(id => channelCounts[id] === 2);

        if (existingChannelId) {
          // Canal já existe
          const { data: existingChannel } = await supabase
            .from('chat_channels')
            .select('*')
            .eq('id', existingChannelId)
            .eq('is_direct', true)
            .single();

          if (existingChannel) {
            return { data: existingChannel, error: null };
          }
        }
      }

      // Criar novo canal direto
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          name: otherUserName,
          is_direct: true,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Adicionar ambos usuários como membros
      const { error: memberError } = await supabase
        .from('chat_channel_members')
        .insert([
          { channel_id: channel.id, user_id: user.id },
          { channel_id: channel.id, user_id: otherUserId }
        ]);

      if (memberError) throw memberError;

      await fetchChannels();
      return { data: channel, error: null };
    } catch (error: any) {
      console.error('Error creating direct channel:', error);
      toast.error('Error al crear conversación');
      return { data: null, error };
    }
  };

  return {
    channels,
    loading,
    fetchChannels,
    createChannel,
    joinChannel,
    createDirectChannel
  };
};