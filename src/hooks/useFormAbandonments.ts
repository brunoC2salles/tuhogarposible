import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FormAbandonment {
  id: string;
  session_id: string;
  nombre_completo: string | null;
  telefono: string | null;
  email: string | null;
  step_reached: number | null;
  abandoned: boolean | null;
  recovered: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  abandoned_at: string | null;
  form_data: any | null;
}

interface Filters {
  startDate: string;
  endDate: string;
  recovered: 'all' | 'true' | 'false';
}

export const useFormAbandonments = () => {
  const [abandonments, setAbandonments] = useState<FormAbandonment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    startDate: '',
    endDate: '',
    recovered: 'all'
  });

  const fetchAbandonments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('form_partial_submissions')
        .select('*')
        .eq('abandoned', true)
        .order('abandoned_at', { ascending: false });

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('abandoned_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('abandoned_at', filters.endDate);
      }

      // Apply recovered filter
      if (filters.recovered !== 'all') {
        query = query.eq('recovered', filters.recovered === 'true');
      }

      const { data, error } = await query;

      if (error) throw error;
      setAbandonments(data || []);
    } catch (error: any) {
      console.error('Error fetching abandonments:', error);
      toast.error('Error al cargar abandonos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbandonments();
  }, [filters]);

  const markAsRecovered = async (id: string) => {
    try {
      const { error } = await supabase
        .from('form_partial_submissions')
        .update({ recovered: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Marcado como contactado');
      await fetchAbandonments();
      return true;
    } catch (error: any) {
      console.error('Error marking as recovered:', error);
      toast.error('Error al actualizar');
      return false;
    }
  };

  return {
    abandonments,
    loading,
    filters,
    setFilters,
    markAsRecovered,
    refetch: fetchAbandonments
  };
};
