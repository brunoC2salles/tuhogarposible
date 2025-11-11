import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DespesaOperacional } from '@/types/financeiro';

export const useDespesas = () => {
  const queryClient = useQueryClient();

  const { data: despesas, isLoading } = useQuery({
    queryKey: ['despesas-operacionais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('despesas_operacionais')
        .select('*')
        .order('data_despesa', { ascending: false });
      
      if (error) throw error;
      return data as DespesaOperacional[];
    }
  });

  const createDespesa = useMutation({
    mutationFn: async (despesa: Omit<DespesaOperacional, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('despesas_operacionais')
        .insert({ ...despesa, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas-operacionais'] });
      toast.success('Despesa registrada com sucesso');
    },
    onError: () => toast.error('Erro ao registrar despesa')
  });

  const updateDespesa = useMutation({
    mutationFn: async ({ id, ...despesa }: Partial<DespesaOperacional> & { id: string }) => {
      const { data, error } = await supabase
        .from('despesas_operacionais')
        .update(despesa)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas-operacionais'] });
      toast.success('Despesa atualizada com sucesso');
    },
    onError: () => toast.error('Erro ao atualizar despesa')
  });

  const deleteDespesa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('despesas_operacionais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas-operacionais'] });
      toast.success('Despesa excluída com sucesso');
    },
    onError: () => toast.error('Erro ao excluir despesa')
  });

  return {
    despesas: despesas || [],
    isLoading,
    createDespesa,
    updateDespesa,
    deleteDespesa
  };
};
