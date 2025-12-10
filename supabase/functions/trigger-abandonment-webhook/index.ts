import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate webhook URL to prevent SSRF attacks
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;
    
    const hostname = parsed.hostname.toLowerCase();
    // Block internal/private network addresses
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname === '169.254.169.254' || // AWS metadata
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { abandonment_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch abandonment data
    const { data: abandonment, error: fetchError } = await supabase
      .from('form_partial_submissions')
      .select('*')
      .eq('id', abandonment_id)
      .single();

    if (fetchError) {
      console.error('[Webhook] Error fetching abandonment');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch abandonment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch configured webhook URL
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_abandonos_url')
      .single();

    if (settingsError || !settings?.value) {
      return new Response(
        JSON.stringify({ message: 'No webhook URL configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = settings.value;
    
    // Validate webhook URL to prevent SSRF
    if (!isValidWebhookUrl(webhookUrl)) {
      console.error('[Webhook] Invalid webhook URL blocked');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const formData = abandonment.form_data || {};

    // Structured payload
    const payload = {
      trigger: 'form_abandonment_automatic',
      timestamp: new Date().toISOString(),
      session_id: abandonment.session_id,
      abandoned_at: abandonment.abandoned_at,
      contact: {
        nombre_completo: abandonment.nombre_completo,
        telefono: abandonment.telefono,
        email: abandonment.email,
      },
      location: {
        comunidad_autonoma: formData.comunidad_autonoma || null,
        ciudad_interes: formData.ciudad_interes || null,
        zona_interes: formData.zona_interes || null,
      },
      employment: {
        situacion_laboral: formData.situacion_laboral || null,
        ingresos_mensuales: formData.ingresos_mensuales || null,
        edad: formData.edad || null,
        menor_de_35: formData.menor_de_35 || null,
        familia_numerosa: formData.familia_numerosa || null,
      },
      purchase_interest: {
        valor_inmueble_deseado: formData.valor_inmueble_deseado || null,
        entrada_disponible: formData.entrada_disponible || null,
      },
      financial: {
        deudas_actuales: formData.deudas_actuales || null,
        en_fichero_morosidad: formData.en_fichero_morosidad || null,
      },
      companion: {
        compra_solo_acompanado: formData.compra_solo_acompanado || null,
        acompanante_nombre: formData.acompanante_nombre || null,
        acompanante_relacion: formData.acompanante_relacion || null,
        acompanante_aporte: formData.acompanante_aporte || null,
      },
      step_reached: abandonment.step_reached,
    };

    // Trigger webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Mark as triggered regardless of result
    const { error: updateError } = await supabase
      .from('form_partial_submissions')
      .update({
        automation_triggered: true,
        automation_triggered_at: new Date().toISOString(),
      })
      .eq('id', abandonment_id);

    if (updateError) {
      console.error('[Webhook] Error updating automation status');
    }

    if (!webhookResponse.ok) {
      console.warn('[Webhook] Webhook failed but marked as triggered');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook triggered',
        webhook_status: webhookResponse.status 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Webhook] Unexpected error');
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
