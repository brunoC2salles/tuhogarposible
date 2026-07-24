import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgenteProfile {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  role: 'admin' | 'agente' | 'supervisor';
  activo: boolean;
}

const fetchAgentesFromDB = async (): Promise<AgenteProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, email, telefono, role, activo')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;

  console.log('[Agentes] Fetched:', data?.length || 0, 'agentes');
  return (data as AgenteProfile[]) || [];
};

export const useAgentes = () => {
  const queryClient = useQueryClient();

  const { data: agentes = [], isLoading: loading, error } = useQuery({
    queryKey: ['agentes'],
    queryFn: fetchAgentesFromDB,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    meta: {
      onError: () => toast.error('Error al cargar agentes'),
    },
  });

  const fetchAgentes = () => {
    queryClient.invalidateQueries({ queryKey: ['agentes'] });
  };

  return {
    agentes,
    loading,
    error: error?.message || null,
    fetchAgentes,
  };
};
