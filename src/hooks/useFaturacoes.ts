import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Faturacao } from '@/types/financeiro';

export const useFaturacoes = () => {
  const queryClient = useQueryClient();

  const { data: faturacoes, isLoading } = useQuery({
    queryKey: ['faturacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faturacoes')
        .select('*')
        .order('data_faturacao', { ascending: false });
      
      if (error) throw error;
      return data as Faturacao[];
    }
  });

  const createFaturacao = useMutation({
    mutationFn: async (faturacao: Omit<Faturacao, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('faturacoes')
        .insert({ ...faturacao, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturacoes'] });
      toast.success('Faturação registrada com sucesso');
    },
    onError: () => toast.error('Erro ao registrar faturação')
  });

  const updateFaturacao = useMutation({
    mutationFn: async ({ id, ...faturacao }: Partial<Faturacao> & { id: string }) => {
      const { data, error } = await supabase
        .from('faturacoes')
        .update(faturacao)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturacoes'] });
      toast.success('Faturação atualizada com sucesso');
    },
    onError: () => toast.error('Erro ao atualizar faturação')
  });

  const deleteFaturacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('faturacoes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturacoes'] });
      toast.success('Faturação excluída com sucesso');
    },
    onError: () => toast.error('Erro ao excluir faturação')
  });

  return {
    faturacoes: faturacoes || [],
    isLoading,
    createFaturacao,
    updateFaturacao,
    deleteFaturacao
  };
};
