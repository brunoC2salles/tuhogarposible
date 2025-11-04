import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lead, LeadFormData, LeadStage } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';

export const useLeads = () => {
  const { user, isAdmin } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('leads')
        .select(`
          *,
          agente:profiles!agente_asignado_id(nombre)
        `)
        .order('created_at', { ascending: false });

      // Agentes veem apenas seus leads, admins veem todos
      if (!isAdmin) {
        query = query.eq('agente_asignado_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Converter dados do banco para o tipo Lead
      const converted = (data || []).map((item: any) => ({
        ...item,
        simulador_personal_data: item.simulador_personal_data as any,
        simulador_hipotecario_data: item.simulador_hipotecario_data as any,
        agente_nombre: Array.isArray(item.agente) && item.agente.length > 0 
          ? item.agente[0].nombre 
          : undefined,
      })) as Lead[];

      setLeads(converted);
      console.log('[Leads] Fetched:', converted.length, 'leads');
    } catch (err: any) {
      console.error('[Leads] Fetch error:', err);
      setError(err.message);
      toast.error('Error al cargar leads');
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData: LeadFormData) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...leadData,
          agente_asignado_id: user.id,
          source: 'manual' as const
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Lead creado exitosamente');
      await fetchLeads();
      return data;
    } catch (err: any) {
      console.error('[Leads] Create error:', err);
      toast.error('Error al crear lead');
      return null;
    }
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update(updates as any)
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead actualizado');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('[Leads] Update error:', err);
      toast.error('Error al actualizar lead');
      return false;
    }
  };

  const updateLeadStage = async (leadId: string, newStage: LeadStage) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', leadId);

      if (error) throw error;

      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('[Leads] Update stage error:', err);
      toast.error('Error al actualizar etapa del lead');
      return false;
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead eliminado');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('[Leads] Delete error:', err);
      toast.error('Error al eliminar lead');
      return false;
    }
  };

  const reassignLead = async (leadId: string, newAgenteId: string) => {
    if (!isAdmin) {
      toast.error('Solo administradores pueden reasignar leads');
      return false;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ agente_asignado_id: newAgenteId })
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead reasignado exitosamente');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('[Leads] Reassign error:', err);
      toast.error('Error al reasignar lead');
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user, isAdmin]);

  return {
    leads,
    loading,
    error,
    fetchLeads,
    createLead,
    updateLead,
    updateLeadStage,
    deleteLead,
    reassignLead,
  };
};
