import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { lead_id, razon } = await req.json();
    
    console.log('[disqualified-lead-webhook] Recebido lead_id:', lead_id, 'razon:', razon);
    
    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do lead com agente
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        profiles!agente_asignado_id(nombre, email)
      `)
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      console.error('[disqualified-lead-webhook] Lead não encontrado:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found', details: leadError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair razão de descualificação das notas ou usar a fornecida
    let razonDescualificacion = razon;
    
    if (!razonDescualificacion && lead.notas) {
      // Tentar extrair de padrões comuns nas notas
      const razonMatch = lead.notas.match(/NO CUALIFICADO - ([^\n]+)/i) 
        || lead.notas.match(/Razón: ([^\n]+)/i)
        || lead.notas.match(/Motivo: ([^\n]+)/i);
      razonDescualificacion = razonMatch?.[1] || null;
    }
    
    razonDescualificacion = razonDescualificacion || 'Motivo no especificado';

    // Buscar URL do webhook configurada
    const { data: setting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_disqualified_url')
      .single();

    const webhookUrl = setting?.value;

    if (!webhookUrl || webhookUrl.trim() === '') {
      console.log('[disqualified-lead-webhook] URL do webhook não configurada');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook URL not configured, skipping' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar payload para Make.com
    const payload = {
      source: 'disqualified_lead',
      timestamp: new Date().toISOString(),
      lead_id: lead.id,
      lead_nombre: lead.nombre_completo,
      lead_email: lead.email,
      lead_telefono: lead.telefono,
      lead_zona_interes: lead.zona_interes || null,
      lead_ciudad_interes: lead.ciudad_interes || null,
      razon_descualificacion: razonDescualificacion,
      agente_nombre: (lead.profiles as any)?.nombre || null,
      agente_email: (lead.profiles as any)?.email || null,
    };

    console.log('[disqualified-lead-webhook] Enviando payload:', JSON.stringify(payload));

    // Enviar webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const logStatus = response.ok ? 'success' : 'error';
    const errorMessage = !response.ok ? `HTTP ${response.status}: ${response.statusText}` : null;

    // Registrar log
    await supabase.from('webhook_logs').insert({
      webhook_url: webhookUrl + ' (disqualified)',
      status: logStatus,
      error_message: errorMessage,
      payload,
    });

    console.log('[disqualified-lead-webhook] Webhook enviado:', logStatus);

    return new Response(
      JSON.stringify({ success: response.ok, status: logStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[disqualified-lead-webhook] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
