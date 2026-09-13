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
  const [secondaryEnabled, setSecondaryEnabled] = useState(true);
  const [savingSecondaryEnabled, setSavingSecondaryEnabled] = useState(false);
  const [disqualifiedEmailUrl, setDisqualifiedEmailUrl] = useState('');
  const [disqualifiedEmailEnabled, setDisqualifiedEmailEnabled] = useState(true);
  const [savingDisqualifiedEmailEnabled, setSavingDisqualifiedEmailEnabled] = useState(false);
  const [savingDisqualifiedEmail, setSavingDisqualifiedEmail] = useState(false);
  const [disqualifiedEmailLogs, setDisqualifiedEmailLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMetaBitrix, setSavingMetaBitrix] = useState(false);
  const [savingSecondary, setSavingSecondary] = useState(false);
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

  const fetchSecondaryEnabled = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_secondary_qualified_enabled')
        .maybeSingle();
      if (!error) {
        const val = (data?.value ?? 'true').toString().toLowerCase();
        setSecondaryEnabled(val !== 'false');
      }
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching secondary enabled flag:', err);
    }
  };

  const saveSecondaryEnabled = async (enabled: boolean) => {
    try {
      setSavingSecondaryEnabled(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key: 'webhook_secondary_qualified_enabled', value: enabled ? 'true' : 'false', description: 'Enable/disable dispatch of qualified leads to the WhatsApp webhook' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setSecondaryEnabled(enabled);
      toast.success(enabled ? 'Envío WhatsApp activado' : 'Envío WhatsApp pausado');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error saving secondary enabled:', err);
      toast.error('Error al guardar el estado');
      return false;
    } finally {
      setSavingSecondaryEnabled(false);
    }
  };

  const fetchDisqualifiedEmailUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_disqualified_email_url')
        .single();
      if (!error && data) setDisqualifiedEmailUrl(data.value || '');
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching disqualified email URL:', err);
    }
  };

  const fetchDisqualifiedEmailEnabled = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_disqualified_email_enabled')
        .maybeSingle();
      if (!error) {
        const val = (data?.value ?? 'true').toString().toLowerCase();
        setDisqualifiedEmailEnabled(val !== 'false');
      }
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching disqualified email enabled flag:', err);
    }
  };

  const saveDisqualifiedEmailEnabled = async (enabled: boolean) => {
    try {
      setSavingDisqualifiedEmailEnabled(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key: 'webhook_disqualified_email_enabled', value: enabled ? 'true' : 'false', description: 'Enable/disable dispatch of disqualified leads to the email webhook' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setDisqualifiedEmailEnabled(enabled);
      toast.success(enabled ? 'Envío de email a desqualificados activado' : 'Envío de email a desqualificados pausado');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error saving disqualified email enabled:', err);
      toast.error('Error al guardar el estado');
      return false;
    } finally {
      setSavingDisqualifiedEmailEnabled(false);
    }
  };

  const saveDisqualifiedEmailUrl = async (url: string) => {
    try {
      setSavingDisqualifiedEmail(true);
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          { key: 'webhook_disqualified_email_url', value: url, description: 'URL del webhook Make.com para disparar el email de oferta de consultoría a leads desqualificados' },
          { onConflict: 'key' }
        );
      if (error) throw error;
      setDisqualifiedEmailUrl(url);
      toast.success('URL del webhook de email a desqualificados guardada');
      return true;
    } catch (err: any) {
      console.error('[AdminSettings] Error saving disqualified email URL:', err);
      toast.error('Error al guardar configuración');
      return false;
    } finally {
      setSavingDisqualifiedEmail(false);
    }
  };

  const fetchDisqualifiedEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .ilike('webhook_url', '%(disqualified_email)%')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setDisqualifiedEmailLogs((data || []) as WebhookLog[]);
    } catch (err: any) {
      console.error('[AdminSettings] Error fetching disqualified email logs:', err);
    }
  };

  const testDisqualifiedEmailWebhook = async () => {
    try {
      toast.info('Enviando test via Edge Function...');
      const { data, error } = await supabase.functions.invoke('make-webhook-proxy', {
        body: { action: 'test_disqualified_last_lead' }
      });
      if (error) { toast.error('Error al conectar con Edge Function'); return false; }
      if (data?.success) {
        toast.success(`✅ Email desqualificado enviado! Lead: "${data.lead_name}" | HTTP ${data.http_status}`);
        fetchDisqualifiedEmailLogs();
        return true;
      }
      toast.error(`❌ Error: ${data?.error || data?.message || 'Unknown error'}`);
      return false;
    } catch (err: any) {
      console.error('[AdminSettings] Error testing disqualified email webhook:', err);
      toast.error('Error al probar webhook');
      return false;
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
    fetchSecondaryQualifiedUrl();
    fetchSecondaryEnabled();
    fetchSecondaryLogs();
    fetchDisqualifiedEmailUrl();
    fetchDisqualifiedEmailEnabled();
    fetchDisqualifiedEmailLogs();
  }, []);

  return {
    webhookUrl,
    metaBitrixWebhookUrl,
    secondaryQualifiedUrl,
    secondaryEnabled,
    savingSecondaryEnabled,
    disqualifiedEmailUrl,
    disqualifiedEmailEnabled,
    savingDisqualifiedEmailEnabled,
    savingDisqualifiedEmail,
    disqualifiedEmailLogs,
    loading,
    saving,
    savingMetaBitrix,
    savingSecondary,
    webhookLogs,
    metaBitrixLogs,
    secondaryLogs,
    saveWebhookUrl,
    saveMetaBitrixWebhookUrl,
    saveSecondaryQualifiedUrl,
    saveSecondaryEnabled,
    saveDisqualifiedEmailUrl,
    saveDisqualifiedEmailEnabled,
    testWebhook,
    testMetaBitrixWebhook,
    testSecondaryQualifiedWebhook,
    testDisqualifiedEmailWebhook,
    replayQualifiedSince,
    refreshLogs: fetchWebhookLogs,
    refreshMetaBitrixLogs: fetchMetaBitrixLogs,
    refreshSecondaryLogs: fetchSecondaryLogs,
    refreshDisqualifiedEmailLogs: fetchDisqualifiedEmailLogs,
  };
};
