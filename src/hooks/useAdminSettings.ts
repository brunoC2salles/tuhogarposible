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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);

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

  useEffect(() => {
    fetchWebhookUrl();
    fetchWebhookLogs();
  }, []);

  return {
    webhookUrl,
    loading,
    saving,
    webhookLogs,
    saveWebhookUrl,
    testWebhook,
    refreshLogs: fetchWebhookLogs,
  };
};
