import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LeadVisit, LeadVisitFormData } from '@/types/visits';

interface UseLeadVisitsOptions {
  scope?: 'mine' | 'all';
  leadId?: string;
}

export const useLeadVisits = (options: UseLeadVisitsOptions = {}) => {
  const { scope = 'mine', leadId } = options;
  const { user, isAdmin, profile } = useAuth();
  const [visits, setVisits] = useState<LeadVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('lead_visits')
        .select('*, leads!lead_visits_lead_id_fkey(nombre_completo), profiles!lead_visits_agente_id_fkey(nombre)')
        .order('fecha_visita', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (scope === 'mine' && !isAdmin && profile?.role !== 'supervisor') {
        query = query.eq('agente_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: LeadVisit[] = (data || []).map((r: any) => ({
        id: r.id,
        lead_id: r.lead_id,
        agente_id: r.agente_id,
        fecha_visita: r.fecha_visita,
        product_urls: r.product_urls || [],
        tiene_reserva: r.tiene_reserva,
        reserva_url: r.reserva_url,
        notas: r.notas,
        created_at: r.created_at,
        updated_at: r.updated_at,
        lead_nombre: r.leads?.nombre_completo,
        agente_nombre: r.profiles?.nombre,
      }));
      setVisits(mapped);
    } catch (err: any) {
      console.error('[useLeadVisits] error', err);
      toast.error('Error al cargar visitas');
    } finally {
      setLoading(false);
    }
  }, [user, scope, leadId, isAdmin, profile?.role]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const createVisit = async (data: LeadVisitFormData) => {
    if (!user) return false;
    const payload = {
      lead_id: data.lead_id,
      agente_id: user.id,
      fecha_visita: data.fecha_visita,
      product_urls: data.product_urls,
      tiene_reserva: data.tiene_reserva,
      reserva_url: data.tiene_reserva ? data.reserva_url : null,
      notas: data.notas || null,
    };
    const { error } = await supabase.from('lead_visits').insert(payload);
    if (error) {
      toast.error('Error al crear visita: ' + error.message);
      return false;
    }
    toast.success('Visita registrada');
    await fetchVisits();
    return true;
  };

  const updateVisit = async (id: string, data: LeadVisitFormData) => {
    const payload = {
      lead_id: data.lead_id,
      fecha_visita: data.fecha_visita,
      product_urls: data.product_urls,
      tiene_reserva: data.tiene_reserva,
      reserva_url: data.tiene_reserva ? data.reserva_url : null,
      notas: data.notas || null,
    };
    const { error } = await supabase.from('lead_visits').update(payload).eq('id', id);
    if (error) {
      toast.error('Error al actualizar: ' + error.message);
      return false;
    }
    toast.success('Visita actualizada');
    await fetchVisits();
    return true;
  };

  const deleteVisit = async (id: string) => {
    const { error } = await supabase.from('lead_visits').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar: ' + error.message);
      return false;
    }
    toast.success('Visita eliminada');
    await fetchVisits();
    return true;
  };

  return { visits, loading, fetchVisits, createVisit, updateVisit, deleteVisit };
};
