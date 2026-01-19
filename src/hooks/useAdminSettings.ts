import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WebhookLog {
  id: string;
  submission_id: string;
  webhook_url: string;
  status: 'success' | 'error';
  error_message?: string;
  created_at: string;
}

export const useAdminSettings = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [metaBitrixWebhookUrl, setMetaBitrixWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMetaBitrix, setSavingMetaBitrix] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [metaBitrixLogs, setMetaBitrixLogs] = useState<WebhookLog[]>([]);

  // Buscar configuração do webhook
  const fetchWebhookUrl = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_makecom_url')
        .single();

      if (error) throw error;
      setWebhookUrl(data?.value || '');
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching webhook URL:', err);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  // Buscar configuração do webhook Meta Bitrix
  const fetchMetaBitrixWebhookUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_meta_bitrix_url')
        .single();

      if (!error && data) {
        setMetaBitrixWebhookUrl(data.value || '');
      }
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching Meta Bitrix webhook URL:', err);
    }
  };

  // Buscar logs de webhook (últimos 20)
  const fetchWebhookLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWebhookLogs((data || []) as WebhookLog[]);
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching webhook logs:', err);
    }
  };

  // Buscar logs de webhook Meta Bitrix (filtrado por URL)
  const fetchMetaBitrixLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .ilike('webhook_url', '%meta%bitrix%')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error) {
        setMetaBitrixLogs((data || []) as WebhookLog[]);
      }
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching Meta Bitrix logs:', err);
    }
  };

  // Guardar URL do webhook
  const saveWebhookUrl = async (url: string) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('admin_settings')
        .update({ value: url })
        .eq('key', 'webhook_makecom_url');

      if (error) throw error;

      setWebhookUrl(url);
      toast.success('Configuración guardada correctamente');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error saving webhook URL:', err);
      toast.error('Error al guardar configuración');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Guardar URL do webhook Meta Bitrix
  const saveMetaBitrixWebhookUrl = async (url: string) => {
    try {
      setSavingMetaBitrix(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { 
            key: 'webhook_meta_bitrix_url', 
            value: url,
            description: 'URL do webhook Make.com para enviar leads qualificados do Meta Ads ao Bitrix24'
          },
          { onConflict: 'key' }
        );

      if (error) throw error;

      setMetaBitrixWebhookUrl(url);
      toast.success('URL del webhook Meta Ads → Bitrix24 guardada');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error saving Meta Bitrix webhook URL:', err);
      toast.error('Error al guardar configuración');
      return false;
    } finally {
      setSavingMetaBitrix(false);
    }
  };

  // Testar webhook (envia payload de teste)
  const testWebhook = async (url: string) => {
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook from Tu Hogar Posible',
        lead: {
          nombre_completo: 'Test Lead',
          email: 'test@example.com',
          telefono: '+34 600 000 000',
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(testPayload),
      });

      toast.success('Webhook de prueba enviado. Verifique Make.com');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error testing webhook:', err);
      toast.error('Error al probar webhook');
      return false;
    }
  };

  // Testar webhook Meta Bitrix - usa o último lead real do CRM
  const testMetaBitrixWebhook = async (url: string) => {
    try {
      // 1. Buscar último lead do CRM
      const { data: lastLead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (leadError || !lastLead) {
        toast.error('No hay leads en el CRM para probar');
        return false;
      }

      // 2. Buscar dados do agente (se existir)
      let agenteData = null;
      if (lastLead.agente_asignado_id) {
        const { data: agente } = await supabase
          .from('profiles')
          .select('id, nombre, email, telefono, tidycal_url')
          .eq('id', lastLead.agente_asignado_id)
          .single();
        agenteData = agente;
      }

      // 3. Buscar recomendações para este lead
      let recomendaciones: any[] = [];
      if (lastLead.ciudad_interes || lastLead.zona_interes) {
        let query = supabase
          .from('inmuebles')
          .select('id, titulo, precio, ciudad, direccion, url_externa')
          .eq('disponible', true)
          .limit(3);

        if (lastLead.ciudad_interes) {
          query = query.ilike('ciudad', `%${lastLead.ciudad_interes}%`);
        }

        const { data: recs } = await query;
        recomendaciones = recs || [];
      }

      // 4. Construir payload com dados reais (achatado para Make.com)
      const testPayload: Record<string, any> = {
        // Campos de identificação
        test: true,
        source: lastLead.source || 'manual',
        timestamp: new Date().toISOString(),
        lead_id: lastLead.id,
        cualificado: true,
        
        // Dados do lead (achatados)
        lead_nombre: lastLead.nombre_completo,
        lead_telefono: lastLead.telefono,
        lead_email: lastLead.email,
        lead_zona_interes: lastLead.zona_interes || '',
        lead_ciudad_interes: lastLead.ciudad_interes || '',
        lead_valor_deseado: lastLead.valor_inmueble_deseado || 0,
        
        // Dados do agente (achatados)
        agente_id: agenteData?.id || '',
        agente_nombre: agenteData?.nombre || 'Sin asignar',
        agente_email: agenteData?.email || '',
        agente_telefono: agenteData?.telefono || '',
        
        // Simulação pessoal (achatados)
        sim_personal_monto_maximo: (lastLead.simulador_personal_data as any)?.montoSolicitado || 0,
        sim_personal_cuota_mensual: (lastLead.simulador_personal_data as any)?.cuotaMensual || 0,
        sim_personal_plazo_meses: (lastLead.simulador_personal_data as any)?.plazoMeses || 0,
        sim_personal_tae: (lastLead.simulador_personal_data as any)?.tasaInteres || 0,
        
        // Simulação hipotecária (achatados)
        sim_hipoteca_monto_maximo: (lastLead.simulador_hipotecario_data as any)?.montoFinanciable || 0,
        sim_hipoteca_valor_inmueble: (lastLead.simulador_hipotecario_data as any)?.valorInmueble || 0,
        sim_hipoteca_cuota_mensual: (lastLead.simulador_hipotecario_data as any)?.cuotaMensual || 0,
        sim_hipoteca_capital_necesario: (lastLead.simulador_hipotecario_data as any)?.capitalPropioNecesario || 0,
        sim_hipoteca_plazo_anos: (lastLead.simulador_hipotecario_data as any)?.plazoAnios || 0,
        sim_hipoteca_tae: (lastLead.simulador_hipotecario_data as any)?.tasaInteres || 0,
        
        // URLs
        crm_url: `https://tu-hogar-vista.lovable.app/agente/crm?lead=${lastLead.id}`
      };

      // Adicionar recomendações ao payload (até 3)
      recomendaciones.forEach((rec, index) => {
        const num = index + 1;
        testPayload[`recom_${num}_titulo`] = rec.titulo || `${rec.ciudad} - ${rec.direccion}`;
        testPayload[`recom_${num}_precio`] = rec.precio;
        testPayload[`recom_${num}_url`] = rec.url_externa || '';
      });

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(testPayload),
      });

      toast.success(`Webhook enviado con datos de "${lastLead.nombre_completo}". Verifique Make.com`);
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error testing Meta Bitrix webhook:', err);
      toast.error('Error al probar webhook');
      return false;
    }
  };

  useEffect(() => {
    fetchWebhookUrl();
    fetchWebhookLogs();
    fetchMetaBitrixWebhookUrl();
    fetchMetaBitrixLogs();
  }, []);

  return {
    webhookUrl,
    metaBitrixWebhookUrl,
    loading,
    saving,
    savingMetaBitrix,
    webhookLogs,
    metaBitrixLogs,
    saveWebhookUrl,
    saveMetaBitrixWebhookUrl,
    testWebhook,
    testMetaBitrixWebhook,
    refreshLogs: fetchWebhookLogs,
    refreshMetaBitrixLogs: fetchMetaBitrixLogs,
  };
};
