import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgenteProfile {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  dni_nie?: string;
  role: 'admin' | 'agente';
  activo: boolean;
}

export const useAgentes = () => {
  const [agentes, setAgentes] = useState<AgenteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email, telefono, dni_nie, role, activo')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      setAgentes(data || []);
      console.log('[Agentes] Fetched:', data?.length || 0, 'agentes');
    } catch (err: any) {
      console.error('[Agentes] Fetch error:', err);
      setError(err.message);
      toast.error('Error al cargar agentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentes();
  }, []);

  return {
    agentes,
    loading,
    error,
    fetchAgentes,
  };
};