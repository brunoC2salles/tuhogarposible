import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadComment {
  id: string;
  lead_id: string;
  user_id: string;
  comentario: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  created_at: string;
  user_nome?: string;
}

export const useLeadComments = (leadId: string | undefined) => {
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchComments = async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('lead_comments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user names separately
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nombre')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.nombre]) || []);

      const commentsWithNames = commentsData.map(comment => ({
        ...comment,
        user_nome: profileMap.get(comment.user_id) || 'Usuario'
      }));

      setComments(commentsWithNames);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast.error('Error al cargar comentarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [leadId]);

  const addComment = async (comentario: string) => {
    if (!leadId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('lead_comments')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          comentario
        });

      if (error) throw error;

      toast.success('Comentario añadido');
      await fetchComments();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Error al añadir comentario');
    }
  };

  const uploadRecording = async (file: File) => {
    if (!leadId) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('lead-recordings')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('lead-recordings')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('lead_comments')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          comentario: 'Grabación de reunión',
          arquivo_url: publicUrl,
          arquivo_nome: file.name
        });

      if (insertError) throw insertError;

      toast.success('Grabación subida correctamente');
      await fetchComments();
    } catch (error: any) {
      console.error('Error uploading recording:', error);
      toast.error('Error al subir grabación');
    } finally {
      setUploading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('lead_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comentario eliminado');
      await fetchComments();
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error('Error al eliminar comentario');
    }
  };

  return {
    comments,
    loading,
    uploading,
    addComment,
    uploadRecording,
    deleteComment,
    refetch: fetchComments
  };
};
