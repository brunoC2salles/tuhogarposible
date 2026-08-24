import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildBitrixPayloadFromLead, extractFromNotes, isLeadQualifiedForBitrix, NON_QUALIFIED_STAGES } from '../_shared/bitrixPayload.ts';
import { dispatchSecondaryQualified } from '../_shared/secondaryQualifiedPayload.ts';
import { claimBitrixDispatch, withDispatchMeta } from '../_shared/bitrixDispatchGuard.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SSRF Protection - validate webhook URL
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    
    // Block internal IPs
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^0\./,
      /\.local$/,
      /\.internal$/,
    ];
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// Convert object to flat URLSearchParams
function flattenPayload(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      result[fullKey] = '';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenPayload(value, fullKey));
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else {
      result[fullKey] = String(value);
    }
  }
  
  return result;
}

// ============================================================================
// Builder do payload Bitrix vive em ../_shared/bitrixPayload.ts (fonte única)
// ============================================================================

// Send webhook with JSON (mesma forma usada por meta-lead-webhook).
// Retorna sucesso, status e corpo (truncado) para diagnóstico.
async function sendToMake(webhookUrl: string, payload: Record<string, any>): Promise<{ success: boolean; status: number; body: string }> {
  console.log('[make-webhook-proxy] Sending to Make.com (JSON):', webhookUrl);
  console.log('[make-webhook-proxy] Payload keys:', Object.keys(payload).join(', '));

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let responseBody = '';
  try { responseBody = (await response.text()).substring(0, 500); } catch {}

  return {
    success: response.ok,
    status: response.status,
    body: responseBody,
  };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, submission_id, lead_id, agente_id } = body;
    
    console.log('[make-webhook-proxy] Action:', action, 'Body keys:', Object.keys(body).join(', '));

    // ============================================
    // ACTION: send_qualified_submission
    // ============================================
    if (action === 'send_qualified_submission') {
      if (!submission_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'submission_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get webhook URL
      const { data: config } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_makecom_url')
        .single();

      const webhookUrl = config?.value;
      
      if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
        console.log('[make-webhook-proxy] Invalid or missing webhook URL');
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook URL not configured or invalid' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get submission data
      const { data: submission, error: subError } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('id', submission_id)
        .single();

      if (subError || !submission) {
        return new Response(
          JSON.stringify({ success: false, error: 'Submission not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get agent data
      let agente: any = null;
      if (submission.agente_asignado_id) {
        const { data: ag } = await supabase
          .from('profiles')
          .select('id, nombre, email, telefono')
          .eq('id', submission.agente_asignado_id)
          .single();
        agente = ag;
      }

      // Build flat payload
      const payload = {
        submission_id: submission.id,
        lead_id: submission.lead_id || '',
        timestamp: new Date().toISOString(),
        source: 'formulario_web',
        
        // Lead data
        lead_nombre: submission.nombre_completo,
        lead_email: submission.email,
        lead_telefono: submission.telefono,
        lead_edad: submission.edad,
        lead_ciudad_interes: submission.ciudad_interes || '',
        lead_comunidad_autonoma: submission.comunidad_autonoma || '',
        lead_valor_deseado: submission.valor_inmueble_deseado || 0,
        
        // Financial data
        fin_entrada_disponible: submission.entrada_disponible || 0,
        fin_ingresos_mensuales: submission.ingresos_mensuales,
        fin_deudas_actuales: submission.deudas_actuales || 0,
        fin_situacion_laboral: submission.situacion_laboral || '',
        fin_en_fichero: submission.en_fichero_morosidad ? 'si' : 'no',
        
        // Companion data
        acompanante_nombre: submission.acompanante_nombre || '',
        acompanante_relacion: submission.acompanante_relacion || '',
        acompanante_aporte: submission.acompanante_aporte || 0,
        
        // Agent data
        agente_id: agente?.id || '',
        agente_nombre: agente?.nombre || 'Sin asignar',
        agente_email: agente?.email || '',
        agente_telefono: agente?.telefono || '',
        agente_tidycal: '',
        
        // Simulation data (personal)
        sim_personal_monto: (submission.simulador_personal_data as any)?.montoSolicitado || 0,
        sim_personal_cuota: (submission.simulador_personal_data as any)?.cuotaMensual || 0,
        sim_personal_plazo: (submission.simulador_personal_data as any)?.plazoMeses || 0,
        sim_personal_tae: (submission.simulador_personal_data as any)?.tasaInteres || 0,
        
        // Simulation data (mortgage)
        sim_hipoteca_monto: (submission.simulador_hipotecario_data as any)?.montoFinanciable || 0,
        sim_hipoteca_cuota: (submission.simulador_hipotecario_data as any)?.cuotaMensual || 0,
        sim_hipoteca_plazo: (submission.simulador_hipotecario_data as any)?.plazoAnios || 0,
        sim_hipoteca_capital: (submission.simulador_hipotecario_data as any)?.capitalPropioNecesario || 0,
        
        // CRM URL
        crm_url: `https://tuhogarposible.lovable.app/agente/crm?lead=${submission.lead_id || submission.id}`,
      };

      // Send to Make
      const result = await sendToMake(webhookUrl, payload);
      
      // Log result
      await supabase.from('webhook_logs').insert({
        submission_id: submission.id,
        webhook_url: webhookUrl,
        status: result.success ? 'success' : 'error',
        error_message: result.success ? null : `HTTP ${result.status}: ${result.body}`,
        payload: payload as any,
      });

      return new Response(
        JSON.stringify({ 
          success: result.success, 
          http_status: result.status,
          message: result.success ? 'Webhook sent successfully' : 'Webhook failed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: test_qualified_last_submission
    // PING TÉCNICO de conexão. NÃO envia dados de lead nem campos financeiros.
    // Para testar o payload Bitrix real, usar 'test_meta_bitrix_last_lead'.
    // ============================================
    if (action === 'test_qualified_last_submission') {
      const { data: config } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_makecom_url')
        .single();

      const webhookUrl = config?.value;

      if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook URL not configured or invalid' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Payload mínimo de PING. Sem dados de lead. Sem campos sim_*. Sem fin_*.
      // Isto garante que ninguém confunda este teste com o payload Meta → Bitrix real.
      const payload = {
        ping: 'true',
        source: 'connection_ping',
        timestamp: new Date().toISOString(),
        message: 'Conexion técnica con Make. Para probar el payload Bitrix real usa "Probar Meta → Bitrix (payload real)".',
      };

      const result = await sendToMake(webhookUrl, payload);

      return new Response(
        JSON.stringify({
          success: result.success,
          http_status: result.status,
          lead_name: 'PING (sin lead)',
          message: result.success ? 'Ping enviado correctamente' : `Failed: HTTP ${result.status}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: test_meta_bitrix_last_lead
    // ============================================
    if (action === 'test_meta_bitrix_last_lead') {
      // Get webhook URL
      const { data: config } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_meta_bitrix_url')
        .single();

      const webhookUrl = config?.value;
      
      if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Meta Bitrix webhook URL not configured or invalid' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get last QUALIFIED lead (exclui descualificados e no_cualificado)
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .not('stage', 'in', `(${NON_QUALIFIED_STAGES.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (leadError || !lead) {
        return new Response(
          JSON.stringify({ success: false, error: 'No qualified leads found in CRM (all leads may be disqualified)' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get agent
      let agente: any = null;
      if (lead.agente_asignado_id) {
        const { data: ag } = await supabase
          .from('profiles')
          .select('id, nombre, email, telefono')
          .eq('id', lead.agente_asignado_id)
          .single();
        agente = ag;
      }

      // Recomendações removidas — inventário próprio decomissionado
      const recomendaciones: any[] = [];


      // Bewor: link ativo de upload de documentos
      const { data: beworToken } = await supabase
        .from('lead_document_tokens')
        .select('token')
        .eq('lead_id', lead.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const beworLink = beworToken?.token
        ? `https://tuhogarposible.lovable.app/documentos/${beworToken.token}`
        : '';

      // Build unified Bitrix payload (mesmo formato do meta-lead-webhook real)
      const payload = buildBitrixPayloadFromLead({
        lead,
        agente,
        recomendaciones,
        beworLink,
        source: 'test_meta_bitrix',
        extra: { test: 'true' },
      });

      const result = await sendToMake(webhookUrl, payload);

      return new Response(
        JSON.stringify({ 
          success: result.success, 
          http_status: result.status,
          lead_name: lead.nombre_completo,
          recommendations_count: recomendaciones.length,
          message: result.success ? 'Test webhook sent successfully' : `Failed: HTTP ${result.status}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: test_secondary_qualified_last_lead
    // Dispara o webhook secundário com o último lead cualificado real.
    // ============================================
    if (action === 'test_secondary_qualified_last_lead') {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .not('stage', 'in', `(${NON_QUALIFIED_STAGES.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (leadError || !lead) {
        return new Response(
          JSON.stringify({ success: false, error: 'No qualified leads found in CRM' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let agente: any = null;
      if (lead.agente_asignado_id) {
        const { data: ag } = await supabase
          .from('profiles')
          .select('id, nombre, email, telefono')
          .eq('id', lead.agente_asignado_id)
          .single();
        agente = ag;
      }

      const { data: tokRow } = await supabase
        .from('lead_document_tokens')
        .select('token')
        .eq('lead_id', lead.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const beworLink = tokRow?.token
        ? `https://tuhogarposible.lovable.app/documentos/${tokRow.token}`
        : null;

      const result = await dispatchSecondaryQualified(supabase, {
        lead,
        agente,
        source: 'test',
        documentoLink: beworLink,
        extra: { test: true },
      });

      return new Response(
        JSON.stringify({
          success: result.sent,
          http_status: result.status ?? 0,
          lead_name: lead.nombre_completo,
          error: result.error || null,
          message: result.sent ? 'Payload secundário enviado con éxito' : `Falló: ${result.error || 'unknown'}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // ============================================
    // ACTION: send_lead_assignment
    // Dispara webhook quando agente é atribuído manualmente
    // ============================================
    if (action === 'send_lead_assignment') {
      // lead_id e agente_id já foram extraídos do body inicial
      if (!lead_id || !agente_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id e agente_id são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get webhook URL (Meta/Bitrix)
      const { data: config } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_meta_bitrix_url')
        .single();

      const webhookUrl = config?.value;
      
      if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
        console.log('[make-webhook-proxy] Meta Bitrix webhook not configured, skipping');
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook Meta/Bitrix não configurado' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .single();

      if (leadError || !lead) {
        return new Response(
          JSON.stringify({ success: false, error: 'Lead não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GUARD: nunca enviar lead descualificado ao Bitrix
      if (!isLeadQualifiedForBitrix(lead)) {
        console.log(`[make-webhook-proxy] BLOQUEADO envio Bitrix: lead ${lead.id} stage=${lead.stage}`);
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: 'lead_no_cualificado', stage: lead.stage }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }


      // Get agent data
      const { data: agente, error: agenteError } = await supabase
        .from('profiles')
        .select('id, nombre, email, telefono')
        .eq('id', agente_id)
        .single();

      if (agenteError || !agente) {
        return new Response(
          JSON.stringify({ success: false, error: 'Agente não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Recomendações removidas — inventário próprio decomissionado
      const recomendaciones: any[] = [];


      // Bewor: link ativo de upload de documentos
      const { data: beworToken2 } = await supabase
        .from('lead_document_tokens')
        .select('token')
        .eq('lead_id', lead.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const beworLink2 = beworToken2?.token
        ? `https://tuhogarposible.lovable.app/documentos/${beworToken2.token}`
        : '';

      // Build unified Bitrix payload (mesmo formato do meta-lead-webhook real)
      const payloadBase = buildBitrixPayloadFromLead({
        lead,
        agente,
        recomendaciones,
        beworLink: beworLink2,
        source: 'manual_assignment',
        extra: { assignment_type: 'manual' },
      });

      // Anti-duplicidade: reatribuição atualiza a negociação existente (dedupe_key = lead_id)
      const claimAssign = await claimBitrixDispatch(supabase, lead.id, agente.id, 'reassign');
      const payload = withDispatchMeta(payloadBase, lead.id, claimAssign);

      const result = await sendToMake(webhookUrl, payload);

      // Log result
      await supabase.from('webhook_logs').insert({
        webhook_url: webhookUrl,
        status: result.success ? 'success' : 'error',
        error_message: result.success ? null : `HTTP ${result.status}: ${result.body}`,
        payload: payload as any,
      });


      console.log(`[make-webhook-proxy] Manual assignment webhook sent for lead ${lead.id}: ${result.success ? 'success' : 'failed'}`);

      return new Response(
        JSON.stringify({ 
          success: result.success, 
          http_status: result.status,
          lead_id: lead.id,
          agente_nombre: agente.nombre,
          message: result.success ? 'Assignment webhook sent successfully' : `Failed: HTTP ${result.status}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: replay_qualified_since
    // Reenvia ao Bitrix (webhook_meta_bitrix_url) todos os leads qualificados
    // criados a partir de `since`, pulando os que já têm log success com mesmo lead_id.
    // ============================================
    if (action === 'replay_qualified_since') {
      const since: string | undefined = body.since;
      if (!since) {
        return new Response(
          JSON.stringify({ success: false, error: 'since (ISO datetime) é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: cfg } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_meta_bitrix_url')
        .single();
      const webhookUrl = cfg?.value;
      if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook Meta/Bitrix não configurado ou inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Leads qualificados desde `since`
      const { data: leads, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .not('stage', 'in', `(${NON_QUALIFIED_STAGES.join(',')})`)
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (leadsErr) {
        return new Response(
          JSON.stringify({ success: false, error: leadsErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const summary = {
        total: leads?.length || 0,
        skipped_already_sent: 0,
        sent_ok: 0,
        sent_failed: 0,
        details: [] as Array<{ lead_id: string; nombre: string; status: string; http?: number; reason?: string }>,
      };

      for (const lead of leads || []) {
        // GUARD: nunca enviar lead descualificado
        if (!isLeadQualifiedForBitrix(lead)) {
          summary.details.push({ lead_id: lead.id, nombre: lead.nombre_completo, status: 'skipped', reason: 'no_cualificado' });
          continue;
        }

        // Verifica no registro de envíos se este lead já foi para o Bitrix
        const { data: priorDispatch } = await supabase
          .from('bitrix_dispatches')
          .select('id')
          .eq('lead_id', lead.id)
          .maybeSingle();

        // Verifica se já existe envio bem-sucedido para este lead_id
        const { data: prior } = await supabase
          .from('webhook_logs')
          .select('id')
          .eq('status', 'success')
          .filter('payload->>lead_id', 'eq', lead.id)
          .limit(1);

        if (priorDispatch || (prior && prior.length > 0)) {
          summary.skipped_already_sent++;
          summary.details.push({ lead_id: lead.id, nombre: lead.nombre_completo, status: 'skipped', reason: 'already_sent' });
          continue;
        }


        // Busca agente
        let agente: any = null;
        if (lead.agente_asignado_id) {
          const { data: ag } = await supabase
            .from('profiles')
            .select('id, nombre, email, telefono')
            .eq('id', lead.agente_asignado_id)
            .single();
          agente = ag;
        }

        // Bewor link
        const { data: tk } = await supabase
          .from('lead_document_tokens')
          .select('token')
          .eq('lead_id', lead.id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const beworLink = tk?.token ? `https://tuhogarposible.lovable.app/documentos/${tk.token}` : '';

        const payload = buildBitrixPayloadFromLead({
          lead,
          agente,
          recomendaciones: [],
          beworLink,
          source: 'replay_qualified',
          extra: { replay: 'true', replay_since: since },
        });

        const result = await sendToMake(webhookUrl, payload);

        await supabase.from('webhook_logs').insert({
          webhook_url: webhookUrl + ' (replay_qualified)',
          status: result.success ? 'success' : 'error',
          error_message: result.success ? null : `HTTP ${result.status}: ${result.body}`,
          payload: payload as any,
        });

        if (result.success) {
          summary.sent_ok++;
          summary.details.push({ lead_id: lead.id, nombre: lead.nombre_completo, status: 'sent', http: result.status });
        } else {
          summary.sent_failed++;
          summary.details.push({ lead_id: lead.id, nombre: lead.nombre_completo, status: 'failed', http: result.status, reason: result.body });
        }
      }

      console.log('[make-webhook-proxy] replay_qualified_since summary:', summary);

      return new Response(
        JSON.stringify({ success: true, since, ...summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ACTION: resend_lead_to_bitrix / resend_leads_batch
    // Reenvia manualmente lead(s) ao webhook Meta Ads → Bitrix e ao webhook de WhatsApp
    // ============================================
    if (action === 'resend_lead_to_bitrix' || action === 'resend_leads_batch') {
      const ids: string[] = action === 'resend_leads_batch'
        ? (Array.isArray(body.lead_ids) ? body.lead_ids : [])
        : (lead_id ? [lead_id] : []);

      if (ids.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id / lead_ids é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: config } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'webhook_meta_bitrix_url')
        .single();

      const webhookUrl = config?.value;
      if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook Meta/Bitrix não configurado' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results: any[] = [];

      for (const id of ids) {
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (leadError || !lead) {
          results.push({ lead_id: id, success: false, error: 'Lead não encontrado' });
          continue;
        }

        if (!isLeadQualifiedForBitrix(lead)) {
          results.push({ lead_id: id, lead_name: lead.nombre_completo, success: false, skipped: true, error: 'Lead no cualificado', stage: lead.stage });
          continue;
        }

        let agente: any = null;
        if (lead.agente_asignado_id) {
          const { data: a } = await supabase
            .from('profiles')
            .select('id, nombre, email, telefono')
            .eq('id', lead.agente_asignado_id)
            .maybeSingle();
          agente = a || null;
        }

        const { data: tokenRow } = await supabase
          .from('lead_document_tokens')
          .select('token')
          .eq('lead_id', lead.id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const beworLink = tokenRow?.token
          ? `https://tuhogarposible.lovable.app/documentos/${tokenRow.token}`
          : '';

        const payloadBase = buildBitrixPayloadFromLead({
          lead,
          agente,
          recomendaciones: [],
          beworLink,
          source: 'manual_resend',
          extra: { resend: true },
        });

        // Anti-duplicidade: reenvio sempre marcado como update (dedupe_key = lead_id)
        const claimResend = await claimBitrixDispatch(supabase, lead.id, agente?.id || null, 'resend');
        const payload = withDispatchMeta(payloadBase, lead.id, claimResend);

        const result = await sendToMake(webhookUrl, payload);

        await supabase.from('webhook_logs').insert({
          webhook_url: webhookUrl,
          status: result.success ? 'success' : 'error',
          error_message: result.success ? null : `HTTP ${result.status}: ${result.body}`,
          payload: payload as any,
        });


        // Fan-out para o webhook secundário (WhatsApp)
        const wa = await dispatchSecondaryQualified(supabase, {
          lead,
          agente,
          source: 'manual_resend',
          documentoLink: beworLink || null,
          extra: { resend: true },
        });

        results.push({
          lead_id: lead.id,
          lead_name: lead.nombre_completo,
          success: result.success,
          http_status: result.status,
          whatsapp_sent: wa.sent,
          whatsapp_error: wa.error ?? null,
        });
      }

      if (action === 'resend_lead_to_bitrix') {
        const r = results[0];
        return new Response(
          JSON.stringify({
            ...r,
            message: r.success ? 'Lead reenviado al Bitrix' : (r.error || `Falló: HTTP ${r.http_status}`),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const okCount = results.filter((r) => r.success).length;
      return new Response(
        JSON.stringify({
          success: okCount > 0,
          total: results.length,
          bitrix_ok: okCount,
          whatsapp_ok: results.filter((r) => r.whatsapp_sent).length,
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[make-webhook-proxy] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
