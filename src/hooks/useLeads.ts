import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lead, LeadFormData, LeadStage, HIDDEN_STAGES } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';
import { correctEmail } from '@/lib/emailCorrection';
import { FASE_CUTOFF } from '@/lib/faseCutoff';

interface UseLeadsOptions {
  /** Limita aos leads criados nos últimos N dias. null = sem limite. Default: null */
  periodDays?: number | null;
  /** Inclui leads em stage 'descualificados'. Default: true (não filtra) */
  includeDisqualified?: boolean;
}

export const useLeads = (options: UseLeadsOptions = {}) => {
  const { periodDays = null, includeDisqualified = true } = options;
  const { user, isAdmin, profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      const isSupervisor = profile?.role === 'supervisor';

      // Calcular cutoff date para filtro de período
      let sinceIso = periodDays != null
        ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      // Aplica o cutoff global (usa o mais restritivo dos dois)
      const cutoffMs = new Date(FASE_CUTOFF).getTime();
      if (!sinceIso || new Date(sinceIso).getTime() < cutoffMs) {
        sinceIso = new Date(cutoffMs).toISOString();
      }

      // Paginated fetch to overcome the 1000-row PostgREST default cap
      const data = await fetchAllPaginated<any>((from, to) => {
        let q = supabase
          .from('leads')
          .select(`
            *,
            profiles!agente_asignado_id(nombre)
          `)
          .is('archivado_at', null)
          .not('stage', 'in', `(${HIDDEN_STAGES.join(',')})`)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (!isAdmin && !isSupervisor) {
          q = q.eq('agente_asignado_id', user.id);
        }
        if (sinceIso) {
          q = q.gte('created_at', sinceIso);
        }
        if (!includeDisqualified) {
          q = q.neq('stage', 'descualificados');
        }
        return q;
      });

      // Converter dados do banco para o tipo Lead
      const converted = (data || []).map((item: any) => ({
        ...item,
        simulador_personal_data: item.simulador_personal_data as any,
        simulador_hipotecario_data: item.simulador_hipotecario_data as any,
        agente_nombre: item.profiles?.nombre,
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
      // Auto-corregir typos comunes en el dominio del email
      let finalLeadData = leadData;
      if (leadData.email) {
        const corr = correctEmail(leadData.email);
        if (corr.corrected) {
          finalLeadData = { ...leadData, email: corr.email };
          toast.info(`Email corregido: ${corr.original} → ${corr.email}`);
          console.log('[Leads] Email auto-corregido:', corr.reason);
        }
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...finalLeadData,
          agente_asignado_id: user.id,
          source: 'manual' as const,
          // Lead manual entra em Buscando vivienda (Cualificado está oculto no frontend)
          stage: 'buscando_vivienda' as const
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
      // Auto-corregir typos comunes en el dominio del email también en updates
      let finalUpdates = updates;
      if (updates.email) {
        const corr = correctEmail(updates.email);
        if (corr.corrected) {
          finalUpdates = { ...updates, email: corr.email };
          toast.info(`Email corregido: ${corr.original} → ${corr.email}`);
          console.log('[Leads] Email auto-corregido en update:', corr.reason);
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(finalUpdates as any)
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

  // Dispara webhook ao Make.com/Bitrix24 após atribuição manual de agente
  const triggerAgentAssignmentWebhook = async (leadId: string, agenteId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('make-webhook-proxy', {
        body: { 
          action: 'send_lead_assignment',
          lead_id: leadId,
          agente_id: agenteId
        }
      });

      if (error) {
        console.error('[Webhook] Erro ao enviar webhook de atribuição:', error);
      } else {
        console.log('[Webhook] Assignment webhook enviado:', data);
      }
    } catch (err) {
      console.error('[Webhook] Exceção no webhook de atribuição:', err);
      // Não bloquear o fluxo principal
    }
  };

  // Visita agendada (21/10/2026): marca manual del agente/admin en Buscando Vivienda.
  // El historial lo registra la base de datos (trigger trg_visita_agendada en leads).
  const toggleVisitaAgendada = async (leadId: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ visita_agendada: value } as any)
        .eq('id', leadId);
      if (error) throw error;
      toast.success(value ? 'Visita agendada marcada' : 'Visita agendada desmarcada');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('[Leads] Visita agendada error:', err);
      toast.error('No se pudo actualizar la visita agendada');
      return false;
    }
  };

  // Llamada realizada (22/10/2026): marca manual del agente/admin en cualquier etapa.
  // El historial lo registra la base de datos (trigger trg_llamada_realizada en leads).
  const toggleLlamadaRealizada = async (leadId: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ llamada_realizada: value } as any)
        .eq('id', leadId);
      if (error) throw error;
      toast.success(value ? 'Llamada realizada marcada' : 'Llamada realizada desmarcada');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('[Leads] Llamada realizada error:', err);
      toast.error('No se pudo actualizar la llamada realizada');
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

      // Disparar webhook para Make.com/Bitrix24 (async, não bloqueia)
      triggerAgentAssignmentWebhook(leadId, newAgenteId);

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
  // Usar IDs estáveis para evitar refetch quando apenas referência muda
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, profile?.id, periodDays, includeDisqualified]);

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
    toggleVisitaAgendada,
    toggleLlamadaRealizada,
  };
};
