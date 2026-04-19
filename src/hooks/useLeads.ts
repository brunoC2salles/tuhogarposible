import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lead, LeadFormData, LeadStage } from '@/types/crm';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllPaginated } from '@/lib/fetchAllPaginated';
import { correctEmail } from '@/lib/emailCorrection';

export const useLeads = () => {
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

      // Paginated fetch to overcome the 1000-row PostgREST default cap
      const data = await fetchAllPaginated<any>((from, to) => {
        let q = supabase
          .from('leads')
          .select(`
            *,
            profiles!agente_asignado_id(nombre)
          `)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (!isAdmin && !isSupervisor) {
          q = q.eq('agente_asignado_id', user.id);
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

  // Create draft invoice when lead reaches "cobro" stage (ready for payment)
  const createDraftInvoiceFromServices = async (leadId: string, leadName: string, agentId?: string) => {
    try {
      // Get lead services
      const { data: services, error: servicesError } = await supabase
        .from('lead_services')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (servicesError) throw servicesError;
      if (!services) {
        console.log('[Leads] No services configured for lead, skipping invoice creation');
        return;
      }

      // Get next invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('get_next_invoice_number');
      
      if (numberError) throw numberError;

      // Check if client data is complete
      const hasCompleteClientData = services.client_company_name && 
        services.client_address && 
        services.client_dni_nif && 
        services.client_email;

      // Create draft invoice
      const { error: invoiceError } = await supabase
        .from('product_invoices')
        .insert({
          invoice_number: invoiceNumber as string,
          lead_id: leadId,
          lead_name: leadName,
          property_price: services.property_price || 0,
          agent_id: agentId || null,
          client_company_name: services.client_company_name || 'Pendiente',
          client_address: services.client_address || 'Pendiente',
          client_dni_nif: services.client_dni_nif || 'Pendiente',
          client_email: services.client_email || 'pendiente@example.com',
          nota_simples: services.nota_simples || false,
          tasaciones: services.tasaciones || false,
          beneficios: services.beneficios || false,
          inspeccion_tecnica: services.inspeccion_tecnica || false,
          iva_incluido: services.iva_incluido || false,
          comision_vivienda: services.comision_vivienda || false,
          comision_vivienda_percent: services.comision_vivienda_percent || null,
          credito: services.credito || false,
          credito_valor: services.credito_valor || null,
          hipoteca: services.hipoteca || false,
          hipoteca_percent: services.hipoteca_percent || null,
          subtotal: services.subtotal || 0,
          iva_amount: services.iva_amount || 0,
          total: services.total || 0,
          status: hasCompleteClientData ? 'generada' : 'draft',
          created_by: user?.id
        });

      if (invoiceError) throw invoiceError;

      toast.success(hasCompleteClientData 
        ? 'Factura creada automáticamente' 
        : 'Borrador de factura creado - complete los datos del cliente');
    } catch (err: any) {
      console.error('[Leads] Error creating draft invoice:', err);
      // Don't show error toast - this is a background operation
    }
  };

  // Disparar webhook para leads descualificados
  const triggerDisqualifiedWebhook = async (leadId: string, razon?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('disqualified-lead-webhook', {
        body: { lead_id: leadId, razon }
      });

      if (error) {
        console.error('[Webhook] Erro ao enviar webhook de descualificação:', error);
      } else {
        console.log('[Webhook] Disqualified webhook enviado:', data);
      }
    } catch (err) {
      console.error('[Webhook] Exceção no webhook de descualificação:', err);
    }
  };

  const updateLeadStage = async (leadId: string, newStage: LeadStage) => {
    try {
      // Get current lead data before update
      const currentLead = leads.find(l => l.id === leadId);
      
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', leadId);

      if (error) throw error;

      // Disparar webhook se lead foi descualificado
      if (newStage === 'descualificados') {
        triggerDisqualifiedWebhook(leadId);
      }

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
  }, [user?.id, isAdmin, profile?.id]);

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
