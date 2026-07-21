import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WebhookLog {
  id: string;
  webhook_url: string;
  status: string;
  error_message?: string | null;
  created_at: string;
  payload?: unknown;
}

export const useAdminSettings = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [metaBitrixWebhookUrl, setMetaBitrixWebhookUrl] = useState('');
  const [secondaryQualifiedUrl, setSecondaryQualifiedUrl] = useState('');
  const [inmovillaUrl, setInmovillaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMetaBitrix, setSavingMetaBitrix] = useState(false);
  const [savingSecondary, setSavingSecondary] = useState(false);
  const [savingInmovilla, setSavingInmovilla] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [metaBitrixLogs, setMetaBitrixLogs] = useState<WebhookLog[]>([]);
  const [secondaryLogs, setSecondaryLogs] = useState<WebhookLog[]>([]);

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

  const fetchMetaBitrixWebhookUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_meta_bitrix_url')
        .single();
      if (!error && data) setMetaBitrixWebhookUrl(data.value || '');
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching Meta Bitrix webhook URL:', err);
    }
  };

  const fetchInmovillaUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'inmovilla_iframe_url')
        .single();
      if (!error && data) setInmovillaUrl(data.value || '');
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching Inmovilla URL:', err);
    }
  };

  const fetchSecondaryQualifiedUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_secondary_qualified_url')
        .single();
      if (!error && data) setSecondaryQualifiedUrl(data.value || '');
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching secondary qualified URL:', err);
    }
  };

  const fetchSecondaryLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .ilike('webhook_url', '%(secondary_qualified)%')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setSecondaryLogs((data || []) as WebhookLog[]);
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching secondary logs:', err);
    }
  };

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

  const fetchMetaBitrixLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .ilike('webhook_url', '%meta%bitrix%')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setMetaBitrixLogs((data || []) as WebhookLog[]);
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching Meta Bitrix logs:', err);
    }
  };

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

  const saveMetaBitrixWebhookUrl = async (url: string) => {
    try {
      setSavingMetaBitrix(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key: 'webhook_meta_bitrix_url', value: url, description: 'URL do webhook Make.com para enviar leads qualificados do Meta Ads ao Bitrix24' },
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

  const saveInmovillaUrl = async (url: string) => {
    try {
      setSavingInmovilla(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key: 'inmovilla_iframe_url', value: url, description: 'URL do iframe do Inmovilla para visualização na página inicial' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setInmovillaUrl(url);
      toast.success('URL del widget Inmovilla guardada');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error saving Inmovilla URL:', err);
      toast.error('Error al guardar configuración');
      return false;
    } finally {
      setSavingInmovilla(false);
    }
  };

  const saveSecondaryQualifiedUrl = async (url: string) => {
    try {
      setSavingSecondary(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key: 'webhook_secondary_qualified_url', value: url, description: 'URL secundario para reenviar todos los datos de leads cualificados a una automatización externa' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setSecondaryQualifiedUrl(url);
      toast.success('URL del webhook WhatsApp guardada');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error saving secondary URL:', err);
      toast.error('Error al guardar configuración');
      return false;
    } finally {
      setSavingSecondary(false);
    }
  };

  const testWebhook = async (_url: string) => {
    try {
      toast.info('Enviando test via Edge Function...');
      const { data, error } = await supabase.functions.invoke('make-webhook-proxy', {
        body: { action: 'test_qualified_last_submission' }
      });
      if (error) { toast.error('Error al conectar con Edge Function'); return false; }
      if (data?.success) { toast.success(`✅ Webhook enviado! HTTP ${data.http_status}`); return true; }
      toast.error(`❌ Error: ${data?.error || data?.message || 'Unknown error'}`);
      return false;
    } catch (err: any) {
      console.error('[AdminSettings] Error testing webhook:', err);
      toast.error('Error al probar webhook');
      return false;
    }
  };

  const testMetaBitrixWebhook = async (_url: string) => {
    try {
      toast.info('Enviando test via Edge Function...');
      const { data, error } = await supabase.functions.invoke('make-webhook-proxy', {
        body: { action: 'test_meta_bitrix_last_lead' }
      });
      if (error) { toast.error('Error al conectar con Edge Function'); return false; }
      if (data?.success) { toast.success(`✅ Webhook enviado! Lead: "${data.lead_name}" | HTTP ${data.http_status}`); return true; }
      toast.error(`❌ Error: ${data?.error || data?.message || 'Unknown error'}`);
      return false;
    } catch (err: any) {
      console.error('[AdminSettings] Error testing Meta Bitrix webhook:', err);
      toast.error('Error al probar webhook');
      return false;
    }
  };

  const testSecondaryQualifiedWebhook = async () => {
    try {
      toast.info('Enviando test via Edge Function...');
      const { data, error } = await supabase.functions.invoke('make-webhook-proxy', {
        body: { action: 'test_secondary_qualified_last_lead' }
      });
      if (error) { toast.error('Error al conectar con Edge Function'); return false; }
      if (data?.success) {
        toast.success(`✅ Webhook secundario enviado! Lead: "${data.lead_name}" | HTTP ${data.http_status}`);
        fetchSecondaryLogs();
        return true;
      }
      toast.error(`❌ Error: ${data?.error || data?.message || 'Unknown error'}`);
      return false;
    } catch (err: any) {
      console.error('[AdminSettings] Error testing secondary webhook:', err);
      toast.error('Error al probar webhook');
      return false;
    }
  };

  const replayQualifiedSince = async (sinceIso: string) => {
    try {
      toast.info('Reenviando leads qualificados...');
      const { data, error } = await supabase.functions.invoke('make-webhook-proxy', {
        body: { action: 'replay_qualified_since', since: sinceIso }
      });
      if (error) { toast.error('Error al ejecutar reenvío'); return null; }
      if (data?.success) {
        toast.success(`Total ${data.total} · Enviados ${data.sent_ok} · Já enviados ${data.skipped_already_sent} · Falhas ${data.sent_failed}`);
        fetchWebhookLogs();
        fetchMetaBitrixLogs();
        fetchSecondaryLogs();
        return data;
      }
      toast.error(`Error: ${data?.error || 'desconocido'}`);
      return null;
    } catch (err: any) {
      console.error('[AdminSettings] Error replay:', err);
      toast.error('Error al ejecutar reenvío');
      return null;
    }
  };

  useEffect(() => {
    fetchWebhookUrl();
    fetchWebhookLogs();
    fetchMetaBitrixWebhookUrl();
    fetchMetaBitrixLogs();
    fetchInmovillaUrl();
    fetchSecondaryQualifiedUrl();
    fetchSecondaryLogs();
  }, []);

  return {
    webhookUrl,
    metaBitrixWebhookUrl,
    secondaryQualifiedUrl,
    inmovillaUrl,
    loading,
    saving,
    savingMetaBitrix,
    savingSecondary,
    savingInmovilla,
    webhookLogs,
    metaBitrixLogs,
    secondaryLogs,
    saveWebhookUrl,
    saveMetaBitrixWebhookUrl,
    saveSecondaryQualifiedUrl,
    saveInmovillaUrl,
    testWebhook,
    testMetaBitrixWebhook,
    testSecondaryQualifiedWebhook,
    replayQualifiedSince,
    refreshLogs: fetchWebhookLogs,
    refreshMetaBitrixLogs: fetchMetaBitrixLogs,
    refreshSecondaryLogs: fetchSecondaryLogs,
  };
};
