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

  // Testar webhook Meta Bitrix - payload achatado para Make.com reconhecer campos
  const testMetaBitrixWebhook = async (url: string) => {
    try {
      const testPayload = {
        // Campos de identificação
        test: true,
        source: 'meta_ads',
        timestamp: new Date().toISOString(),
        lead_id: 'test-' + Date.now(),
        cualificado: true,
        
        // Dados do lead (achatados)
        lead_nombre: 'Test Lead Meta Ads',
        lead_telefono: '+34 600 000 000',
        lead_email: 'test-meta@example.com',
        lead_edad: 35,
        lead_zona_interes: 'Barcelona',
        lead_habitaciones: 3,
        lead_ingresos_estimados: 2250,
        lead_deudas_mensuales: 300,
        lead_preferencia_llamada: 'mañana',
        
        // Dados do agente (achatados)
        agente_id: 'test-agent-id',
        agente_nombre: 'Agente Test',
        agente_email: 'agente@example.com',
        agente_telefono: '+34 600 111 222',
        
        // Simulação pessoal (achatados)
        sim_personal_monto_maximo: 15000,
        sim_personal_cuota_mensual: 280,
        sim_personal_plazo_meses: 84,
        sim_personal_tae: 8,
        
        // Simulação hipotecária (achatados)
        sim_hipoteca_monto_maximo: 180000,
        sim_hipoteca_valor_inmueble: 225000,
        sim_hipoteca_cuota_mensual: 750,
        sim_hipoteca_capital_necesario: 67500,
        sim_hipoteca_plazo_anos: 30,
        sim_hipoteca_tae: 3.5,
        
        // Recomendações (achatadas - até 3)
        recom_1_titulo: 'Piso 3 hab Barcelona Centro',
        recom_1_precio: 195000,
        recom_1_url: 'https://example.com/piso1',
        recom_2_titulo: 'Apartamento 3 hab Eixample',
        recom_2_precio: 210000,
        recom_2_url: 'https://example.com/piso2',
        recom_3_titulo: 'Piso reformado Gracia',
        recom_3_precio: 189000,
        recom_3_url: 'https://example.com/piso3',
        
        // URLs
        crm_url: 'https://tu-hogar-vista.lovable.app/agente/crm?lead=test'
      };

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(testPayload),
      });

      toast.success('Webhook Meta → Bitrix24 de prueba enviado. Verifique Make.com');
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
