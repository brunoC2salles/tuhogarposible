import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Send webhook with x-www-form-urlencoded
async function sendToMake(webhookUrl: string, payload: Record<string, any>): Promise<{ success: boolean; status: number; body: string }> {
  const flatPayload = flattenPayload(payload);
  const body = new URLSearchParams(flatPayload).toString();
  
  console.log('[make-webhook-proxy] Sending to Make.com:', webhookUrl);
  console.log('[make-webhook-proxy] Flat payload keys:', Object.keys(flatPayload).join(', '));
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body,
  });
  
  const responseBody = await response.text();
  
  return {
    success: response.ok,
    status: response.status,
    body: responseBody.substring(0, 500),
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

    const { action, submission_id } = await req.json();
    
    console.log('[make-webhook-proxy] Action:', action, 'Submission ID:', submission_id);

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
          .select('id, nombre, email, telefono, tidycal_url')
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
        agente_tidycal: agente?.tidycal_url || '',
        
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
        crm_url: `https://tu-hogar-vista.lovable.app/agente/crm?lead=${submission.lead_id || submission.id}`,
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
    // ============================================
    if (action === 'test_qualified_last_submission') {
      // Get webhook URL
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

      // Get last qualified submission
      const { data: submission, error: subError } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('qualificado', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError || !submission) {
        return new Response(
          JSON.stringify({ success: false, error: 'No qualified submissions found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get agent
      let agente: any = null;
      if (submission.agente_asignado_id) {
        const { data: ag } = await supabase
          .from('profiles')
          .select('id, nombre, email, telefono, tidycal_url')
          .eq('id', submission.agente_asignado_id)
          .single();
        agente = ag;
      }

      const payload = {
        test: 'true',
        submission_id: submission.id,
        lead_id: submission.lead_id || '',
        timestamp: new Date().toISOString(),
        source: 'test_qualified',
        
        lead_nombre: submission.nombre_completo,
        lead_email: submission.email,
        lead_telefono: submission.telefono,
        lead_edad: submission.edad,
        lead_ciudad_interes: submission.ciudad_interes || '',
        lead_comunidad_autonoma: submission.comunidad_autonoma || '',
        lead_valor_deseado: submission.valor_inmueble_deseado || 0,
        
        fin_entrada_disponible: submission.entrada_disponible || 0,
        fin_ingresos_mensuales: submission.ingresos_mensuales,
        fin_deudas_actuales: submission.deudas_actuales || 0,
        
        agente_id: agente?.id || '',
        agente_nombre: agente?.nombre || 'Sin asignar',
        agente_email: agente?.email || '',
        agente_telefono: agente?.telefono || '',
        
        sim_personal_monto: (submission.simulador_personal_data as any)?.montoSolicitado || 0,
        sim_personal_cuota: (submission.simulador_personal_data as any)?.cuotaMensual || 0,
        sim_hipoteca_monto: (submission.simulador_hipotecario_data as any)?.montoFinanciable || 0,
        sim_hipoteca_cuota: (submission.simulador_hipotecario_data as any)?.cuotaMensual || 0,
        
        crm_url: `https://tu-hogar-vista.lovable.app/agente/crm?lead=${submission.lead_id || submission.id}`,
      };

      const result = await sendToMake(webhookUrl, payload);

      return new Response(
        JSON.stringify({ 
          success: result.success, 
          http_status: result.status,
          lead_name: submission.nombre_completo,
          message: result.success ? 'Test webhook sent successfully' : `Failed: HTTP ${result.status}`,
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

      // Get last QUALIFIED lead (excluding no_cualificado)
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .neq('stage', 'no_cualificado')
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
          .select('id, nombre, email, telefono, tidycal_url')
          .eq('id', lead.agente_asignado_id)
          .single();
        agente = ag;
      }

      // Get recommendations - MESMA lógica do frontend useRecomendaciones.ts
      let recomendaciones: any[] = [];
      
      let query = supabase
        .from('inmuebles')
        .select('id, titulo, precio, ciudad, direccion, region, url_externa')
        .eq('disponible', true);

      // Construir filtro combinado para cidade e zona (igual useRecomendaciones.ts)
      if (lead.ciudad_interes && lead.zona_interes) {
        query = query.or(
          `ciudad.ilike.%${lead.ciudad_interes}%,` +
          `region.ilike.%${lead.zona_interes}%,` +
          `direccion.ilike.%${lead.zona_interes}%`
        );
      } else if (lead.ciudad_interes) {
        query = query.ilike('ciudad', `%${lead.ciudad_interes}%`);
      } else if (lead.zona_interes) {
        query = query.or(
          `region.ilike.%${lead.zona_interes}%,` +
          `direccion.ilike.%${lead.zona_interes}%,` +
          `ciudad.ilike.%${lead.zona_interes}%`
        );
      }

      const { data: recs } = await query;
      let filteredRecs = recs || [];

      // Filtrar por valor (se disponível) - até 135% do valor máximo do imóvel
      const simHipotecaData = lead.simulador_hipotecario_data as any || {};
      const valorMaximo = simHipotecaData.valor_maximo_inmueble || simHipotecaData.valorMaximoInmueble || 0;
      
      if (valorMaximo > 0) {
        const maxValue = valorMaximo * 1.35;
        filteredRecs = filteredRecs.filter((r: any) => r.precio <= maxValue);
        
        // Ordenar por proximidade ao valor máximo
        filteredRecs.sort((a: any, b: any) => 
          Math.abs(a.precio - valorMaximo) - Math.abs(b.precio - valorMaximo)
        );
      }

      // Limitar a 3 recomendações para o webhook
      recomendaciones = filteredRecs.slice(0, 3);

      // Get simulation data with fallbacks for different field names
      const simPersonal = lead.simulador_personal_data as any || {};
      const simHipoteca = lead.simulador_hipotecario_data as any || {};

      // Helper function to extract data from lead notes
      const extractFromNotes = (notas: string | null, key: string): string => {
        if (!notas) return '';
        const regex = new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, 'i');
        const match = notas.match(regex);
        return match ? match[1].trim() : '';
      };

      const payload: Record<string, any> = {
        test: 'true',
        source: lead.source || 'manual',
        timestamp: new Date().toISOString(),
        lead_id: lead.id,
        cualificado: 'true',
        
        lead_nombre: lead.nombre_completo,
        lead_telefono: lead.telefono,
        lead_email: lead.email,
        lead_zona_interes: lead.zona_interes || '',
        lead_ciudad_interes: lead.ciudad_interes || '',
        lead_valor_deseado: lead.valor_inmueble_deseado || 0,
        
        // Ingresos mensuales - campo fundamental para simuladores
        lead_ingresos_mensuales: simHipoteca.ingresos || simPersonal.ingresos || 0,
        
        // Campos extraídos das notas (Meta Ads)
        lead_habitaciones: extractFromNotes(lead.notas, 'Habitaciones'),
        meta_antiguedad_trabajo: extractFromNotes(lead.notas, 'Antigüedad'),
        lead_preferencia_llamada: extractFromNotes(lead.notas, 'Preferência de chamada'),
        meta_dni_nie: extractFromNotes(lead.notas, 'DNI/NIE'),
        
        agente_id: agente?.id || '',
        agente_nombre: agente?.nombre || 'Sin asignar',
        agente_email: agente?.email || '',
        agente_telefono: agente?.telefono || '',
        
        // Simulação pessoal - múltiplos fallbacks para diferentes formatos
        sim_personal_monto_maximo: simPersonal.monto_maximo || simPersonal.montoSolicitado || simPersonal.montoMaximoCredito || 0,
        sim_personal_cuota_mensual: simPersonal.cuota_mensual || simPersonal.cuotaMensual || 0,
        sim_personal_plazo_meses: simPersonal.plazo_meses || simPersonal.plazoMeses || 0,
        sim_personal_aprobado: simPersonal.aprobado ?? true,
        
        // Simulação hipotecária - múltiplos fallbacks para diferentes formatos
        sim_hipoteca_monto_financiable: simHipoteca.monto_maximo_financiable || simHipoteca.montoFinanciable || 0,
        sim_hipoteca_valor_max_inmueble: simHipoteca.valor_maximo_inmueble || simHipoteca.valorMaximoInmueble || 0,
        sim_hipoteca_cuota_maxima: simHipoteca.cuota_maxima_mensual || simHipoteca.cuotaMensual || 0,
        sim_hipoteca_capital_necesario: simHipoteca.capital_necesario || simHipoteca.capitalPropioNecesario || 0,
        sim_hipoteca_plazo_anos: simHipoteca.plazo_anos || simHipoteca.plazoAnios || 0,
        sim_hipoteca_aprobable: simHipoteca.aprobado ?? true,
        
        // Campo de dívidas mensais (extraído das notas se disponível)
        meta_deudas_mensuales: 0,
        
        crm_url: `https://tu-hogar-vista.lovable.app/agente/crm?lead=${lead.id}`,
      };

      // Add recommendations with INVENTORY VERCEL LINKS
      recomendaciones.forEach((rec, index) => {
        const num = index + 1;
        payload[`recom_${num}_titulo`] = rec.titulo || `${rec.ciudad} - ${rec.direccion}`;
        payload[`recom_${num}_precio`] = rec.precio;
        // Use Vercel inventory link
        payload[`recom_${num}_url`] = rec.id ? `https://inventariotuhogarposible.vercel.app/produto/${rec.id}` : '';
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
