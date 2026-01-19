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
        .upsert({ 
          key: 'webhook_meta_bitrix_url', 
          value: url,
          description: 'URL do webhook Make.com para enviar leads qualificados do Meta Ads ao Bitrix24'
        });

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

  // Testar webhook Meta Bitrix
  const testMetaBitrixWebhook = async (url: string) => {
    try {
      const testPayload = {
        test: true,
        source: 'meta_ads',
        timestamp: new Date().toISOString(),
        message: 'Test Meta Ads → Bitrix24 webhook',
        lead: {
          nombre: 'Test Lead Meta Ads',
          email: 'test-meta@example.com',
          telefono: '+34 600 000 000',
          zona_interes: 'Barcelona'
        },
        agente: {
          nombre: 'Agente Test',
          email: 'agente@example.com'
        },
        simulacion_personal: {
          monto_maximo: 15000,
          cuota_mensual: 280
        },
        simulacion_hipotecaria: {
          monto_maximo_financiable: 180000,
          valor_maximo_inmueble: 225000
        }
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
