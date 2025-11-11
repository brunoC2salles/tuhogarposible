import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrainingVideo, VideoCategory } from '@/types/academia';
import { toast } from 'sonner';

export const useTrainingVideos = (categoria?: VideoCategory) => {
  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useQuery({
    queryKey: ['training-videos', categoria],
    queryFn: async () => {
      let query = supabase
        .from('training_videos')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingVideo[];
    }
  });

  const createVideo = useMutation({
    mutationFn: async (video: Omit<TrainingVideo, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('training_videos')
        .insert(video)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      toast.success('Video agregado correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al agregar video: ' + error.message);
    }
  });

  const updateVideo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingVideo> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_videos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      toast.success('Video actualizado correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar video: ' + error.message);
    }
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-videos'] });
      toast.success('Video eliminado correctamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar video: ' + error.message);
    }
  });

  return {
    videos: videos || [],
    isLoading,
    createVideo,
    updateVideo,
    deleteVideo
  };
};
