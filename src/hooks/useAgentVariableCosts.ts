import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentVariableCost {
  id: string;
  invoice_id?: string;
  agent_id: string;
  description: string;
  amount: number;
  status: 'pendiente' | 'pagado';
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

// Bruno Salles ID - receives 5% of all invoices
export const BRUNO_SALLES_ID = '8c088d8b-156b-45a2-9559-9cb13cedfc22';

export const useAgentVariableCosts = (agentId?: string) => {
  const queryClient = useQueryClient();

  const { data: costs, isLoading } = useQuery({
    queryKey: ['agent-variable-costs', agentId],
    queryFn: async () => {
      let query = supabase
        .from('agent_variable_costs')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AgentVariableCost[];
    }
  });

  const createCost = useMutation({
    mutationFn: async (cost: Omit<AgentVariableCost, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('agent_variable_costs')
        .insert(cost)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-variable-costs'] });
    },
    onError: (error) => {
      console.error('Error creating variable cost:', error);
      toast.error('Error al crear costo variable');
    }
  });

  const markAsPaid = useMutation({
    mutationFn: async (costId: string) => {
      const { data, error } = await supabase
        .from('agent_variable_costs')
        .update({ 
          status: 'pagado',
          paid_at: new Date().toISOString()
        })
        .eq('id', costId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-variable-costs'] });
      toast.success('Costo marcado como pagado');
    },
    onError: () => toast.error('Error al marcar como pagado')
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, ...cost }: Partial<AgentVariableCost> & { id: string }) => {
      const { data, error } = await supabase
        .from('agent_variable_costs')
        .update(cost)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-variable-costs'] });
      toast.success('Costo actualizado');
    },
    onError: () => toast.error('Error al actualizar costo')
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_variable_costs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-variable-costs'] });
      toast.success('Costo eliminado');
    },
    onError: () => toast.error('Error al eliminar costo')
  });

  // Calculate monthly balance (pending costs for current month)
  const calculateMonthlyBalance = () => {
    if (!costs) return 0;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return costs
      .filter(cost => {
        const costDate = new Date(cost.created_at);
        return costDate >= startOfMonth && cost.status === 'pendiente';
      })
      .reduce((sum, cost) => sum + Number(cost.amount), 0);
  };

  return {
    costs: costs || [],
    isLoading,
    createCost,
    markAsPaid,
    updateCost,
    deleteCost,
    calculateMonthlyBalance
  };
};
