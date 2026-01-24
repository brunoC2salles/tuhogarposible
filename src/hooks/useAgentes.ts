import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgenteProfile {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  dni_nie?: string;
  role: 'admin' | 'agente' | 'supervisor';
  activo: boolean;
  comision_porcentaje?: number;
}

const fetchAgentesFromDB = async (): Promise<AgenteProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, email, telefono, dni_nie, role, activo, comision_porcentaje')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;
  
  console.log('[Agentes] Fetched:', data?.length || 0, 'agentes');
  return data || [];
};

export const useAgentes = () => {
  const queryClient = useQueryClient();

  const { data: agentes = [], isLoading: loading, error } = useQuery({
    queryKey: ['agentes'],
    queryFn: fetchAgentesFromDB,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 2,
    meta: {
      onError: () => toast.error('Error al cargar agentes')
    }
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
