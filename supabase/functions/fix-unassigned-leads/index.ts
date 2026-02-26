import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Same city mapping as meta-lead-webhook
const CIUDADES_COMUNIDAD_MAP: Record<string, string> = {
  'barcelona': 'Cataluña', 'tarragona': 'Cataluña', 'girona': 'Cataluña', 'lleida': 'Cataluña',
  'catalunya': 'Cataluña', 'cataluña': 'Cataluña', 'sabadell': 'Cataluña', 'terrassa': 'Cataluña',
  'hospitalet': 'Cataluña', 'llobregat': 'Cataluña', 'badalona': 'Cataluña', 'reus': 'Cataluña',
  'vilanova': 'Cataluña', 'geltru': 'Cataluña', 'olot': 'Cataluña', 'manresa': 'Cataluña',
  'valles': 'Cataluña', 'vallès': 'Cataluña', 'mataró': 'Cataluña', 'mataro': 'Cataluña',
  'madrid': 'Comunidad de Madrid', 'colmenar viejo': 'Comunidad de Madrid',
  'mostoles': 'Comunidad de Madrid', 'móstoles': 'Comunidad de Madrid',
  'leganes': 'Comunidad de Madrid', 'leganés': 'Comunidad de Madrid', 'pinto': 'Comunidad de Madrid',
  'getafe': 'Comunidad de Madrid', 'alcobendas': 'Comunidad de Madrid',
  'torrejon': 'Comunidad de Madrid', 'torrejón': 'Comunidad de Madrid',
  'vallecas': 'Comunidad de Madrid', 'fuenlabrada': 'Comunidad de Madrid', 'parla': 'Comunidad de Madrid',
  'arganda': 'Comunidad de Madrid', 'rivas': 'Comunidad de Madrid', 'coslada': 'Comunidad de Madrid',
  'alcalá': 'Comunidad de Madrid', 'alcala': 'Comunidad de Madrid',
  'valencia': 'Comunidad Valenciana', 'alicante': 'Comunidad Valenciana',
  'castellón': 'Comunidad Valenciana', 'castellon': 'Comunidad Valenciana',
  'paterna': 'Comunidad Valenciana', 'benidorm': 'Comunidad Valenciana', 'elche': 'Comunidad Valenciana',
  'torrevieja': 'Comunidad Valenciana', 'gandia': 'Comunidad Valenciana',
  'sevilla': 'Andalucía', 'málaga': 'Andalucía', 'malaga': 'Andalucía', 'granada': 'Andalucía',
  'córdoba': 'Andalucía', 'cordoba': 'Andalucía', 'almería': 'Andalucía', 'almeria': 'Andalucía',
  'cádiz': 'Andalucía', 'cadiz': 'Andalucía', 'jaén': 'Andalucía', 'jaen': 'Andalucía',
  'huelva': 'Andalucía', 'andalucía': 'Andalucía', 'andalucia': 'Andalucía',
  'zaragoza': 'Aragón', 'huesca': 'Aragón', 'teruel': 'Aragón',
  'murcia': 'Región de Murcia', 'la alberca': 'Región de Murcia', 'cartagena': 'Región de Murcia',
  'palma': 'Islas Baleares', 'mallorca': 'Islas Baleares', 'ibiza': 'Islas Baleares',
  'menorca': 'Islas Baleares', 'baleares': 'Islas Baleares',
  'tenerife': 'Canarias', 'gran canaria': 'Canarias', 'las palmas': 'Canarias',
  'canarias': 'Canarias', 'lanzarote': 'Canarias', 'fuerteventura': 'Canarias',
  'puerto del rosario': 'Canarias',
  'vigo': 'Galicia', 'coruña': 'Galicia', 'santiago': 'Galicia', 'pontevedra': 'Galicia',
  'lugo': 'Galicia', 'ourense': 'Galicia', 'galicia': 'Galicia',
  'santander': 'Cantabria', 'cantabria': 'Cantabria',
  'gijón': 'Principado de Asturias', 'gijon': 'Principado de Asturias', 'oviedo': 'Principado de Asturias',
  'asturias': 'Principado de Asturias',
  'valladolid': 'Castilla y León', 'salamanca': 'Castilla y León', 'león': 'Castilla y León',
  'leon': 'Castilla y León', 'burgos': 'Castilla y León', 'segovia': 'Castilla y León',
  'ponferrada': 'Castilla y León',
  'toledo': 'Castilla-La Mancha', 'ciudad real': 'Castilla-La Mancha', 'albacete': 'Castilla-La Mancha',
  'cuenca': 'Castilla-La Mancha', 'guadalajara': 'Castilla-La Mancha',
  'alovera': 'Castilla-La Mancha', 'seseña': 'Castilla-La Mancha', 'sesena': 'Castilla-La Mancha',
  'yuncos': 'Castilla-La Mancha', 'illescas': 'Castilla-La Mancha',
  'cáceres': 'Extremadura', 'caceres': 'Extremadura', 'badajoz': 'Extremadura',
  'logroño': 'La Rioja', 'logronyo': 'La Rioja', 'rioja': 'La Rioja',
};

function determinarRegion(zonaInteres?: string | null): string | null {
  if (!zonaInteres) return null;
  const zonaNormalizada = zonaInteres.toLowerCase().trim();
  for (const [key, comunidad] of Object.entries(CIUDADES_COMUNIDAD_MAP)) {
    if (zonaNormalizada.includes(key)) {
      return comunidad;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Get unassigned leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, nombre_completo, telefono, email, zona_interes, ciudad_interes, notas, simulador_personal_data, simulador_hipotecario_data, created_at')
      .eq('stage', 'nuevo_lead')
      .is('agente_asignado_id', null)
      .order('created_at', { ascending: true });

    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: 'No unassigned leads found', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[fix-unassigned] Found ${leads.length} unassigned leads`);

    // 2. Get all active agents with regions
    const { data: agents, error: agentsError } = await supabase
      .from('profiles')
      .select('id, nombre, email, telefono, tidycal_url, region_round_robin')
      .eq('activo', true)
      .not('region_round_robin', 'is', null);

    if (agentsError) throw agentsError;
    if (!agents || agents.length === 0) {
      return new Response(JSON.stringify({ error: 'No agents with regions found' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[fix-unassigned] Agents available: ${agents.map(a => `${a.nombre}(${a.region_round_robin?.length || 0} regions)`).join(', ')}`);

    // 3. Get Bitrix webhook URL
    const { data: webhookSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_meta_bitrix_url')
      .single();

    const webhookUrl = webhookSetting?.value;
    console.log(`[fix-unassigned] Bitrix webhook URL: ${webhookUrl ? 'configured' : 'NOT configured'}`);

    // 4. Track round-robin per region
    const regionCounters: Record<string, number> = {};

    // Load existing tracking
    const { data: trackingData } = await supabase
      .from('agent_assignment_tracking')
      .select('region, last_assigned_agent_id');

    const trackingMap: Record<string, string | null> = {};
    if (trackingData) {
      for (const t of trackingData) {
        trackingMap[t.region] = t.last_assigned_agent_id;
      }
    }

    const results: any[] = [];

    for (const lead of leads) {
      try {
        // Determine region
        const region = determinarRegion(lead.zona_interes || lead.ciudad_interes);
        const regionTracking = region || 'fallback';

        // Find matching agents
        let matchingAgents = region
          ? agents.filter(a => a.region_round_robin && Array.isArray(a.region_round_robin) && a.region_round_robin.includes(region))
          : [];

        // Fallback: agents with most regions
        if (matchingAgents.length === 0) {
          matchingAgents = [...agents]
            .filter(a => a.region_round_robin && Array.isArray(a.region_round_robin) && a.region_round_robin.length > 0)
            .sort((a, b) => (b.region_round_robin?.length || 0) - (a.region_round_robin?.length || 0));
        }

        if (matchingAgents.length === 0) {
          console.error(`[fix-unassigned] No agents for lead ${lead.id}`);
          results.push({ lead_id: lead.id, nombre: lead.nombre_completo, status: 'no_agent' });
          continue;
        }

        // Round-robin within region
        const lastAgentId = trackingMap[regionTracking];
        let nextIndex = 0;
        if (lastAgentId) {
          const lastIdx = matchingAgents.findIndex(a => a.id === lastAgentId);
          nextIndex = lastIdx >= 0 ? (lastIdx + 1) % matchingAgents.length : 0;
        }

        const agent = matchingAgents[nextIndex];
        trackingMap[regionTracking] = agent.id;

        // Update lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({ agente_asignado_id: agent.id })
          .eq('id', lead.id);

        if (updateError) {
          console.error(`[fix-unassigned] Update failed for ${lead.id}:`, updateError);
          results.push({ lead_id: lead.id, nombre: lead.nombre_completo, status: 'update_error', error: updateError.message });
          continue;
        }

        // Update tracking
        await supabase
          .from('agent_assignment_tracking')
          .upsert({ region: regionTracking, last_assigned_agent_id: agent.id, last_assignment_at: new Date().toISOString() }, { onConflict: 'region' });

        console.log(`[fix-unassigned] Assigned ${lead.nombre_completo} -> ${agent.nombre} (region: ${regionTracking})`);

        // Extract data from notas for Bitrix payload
        const notas = lead.notas || '';
        const edadMatch = notas.match(/Edad:\s*(\d+)/);
        const edad = edadMatch ? parseInt(edadMatch[1]) : null;
        const dniMatch = notas.match(/DNI\/NIE:\s*(\S+)/);
        const dniNie = dniMatch ? dniMatch[1] : null;
        const antigMatch = notas.match(/Antigüedad:\s*(.+)/);
        const antiguedad = antigMatch ? antigMatch[1].trim() : null;
        const habMatch = notas.match(/Habitaciones:\s*(\S+)/);
        const habitaciones = habMatch ? habMatch[1] : null;
        const prefMatch = notas.match(/Preferência de chamada:\s*(.+)/);
        const preferencia = prefMatch ? prefMatch[1].trim() : null;
        const ahorrosMatch = notas.match(/Ahorros para impuestos:\s*(.+)/);
        const ahorros = ahorrosMatch ? ahorrosMatch[1].trim() : null;
        const viviendaSelMatch = notas.match(/Vivienda seleccionada:\s*(.+)/);
        const viviendaSel = viviendaSelMatch ? viviendaSelMatch[1].trim() : null;

        const simPersonal = lead.simulador_personal_data as any || {};
        const simHipoteca = lead.simulador_hipotecario_data as any || {};

        // Get inmueble recommendations
        let recom: any[] = [];
        try {
          const valorMax = simHipoteca.valor_maximo_inmueble;
          const precioMax = !isNaN(valorMax) && valorMax > 0 ? Math.round(valorMax * 1.35) : null;
          
          let query = supabase
            .from('inmuebles')
            .select('id, titulo, precio, quartos, ciudad')
            .eq('disponible', true);
          
          if (precioMax) query = query.lte('precio', precioMax);

          const ciudadBuscar = lead.ciudad_interes;
          if (ciudadBuscar) {
            query = query.or(`ciudad.ilike.%${ciudadBuscar}%,region.ilike.%${ciudadBuscar}%`);
          }

          const { data: inmuebles } = await query.order('precio', { ascending: true }).limit(3);
          recom = inmuebles || [];
        } catch (e) {
          console.error(`[fix-unassigned] Recom error for ${lead.id}:`, e);
        }

        // Send Bitrix webhook
        let webhookStatus = 'skipped';
        if (webhookUrl && webhookUrl.trim() !== '') {
          try {
            const bitrixPayload = {
              source: 'meta_ads',
              timestamp: new Date().toISOString(),
              lead_id: lead.id,
              cualificado: true,
              lead_nombre: lead.nombre_completo,
              lead_telefono: lead.telefono,
              lead_email: lead.email,
              lead_edad: edad,
              lead_zona_interes: lead.zona_interes || null,
              lead_habitaciones: habitaciones,
              lead_ingresos_estimados: simPersonal.cuota_mensual ? Math.round(simPersonal.cuota_mensual / 0.35) : null,
              lead_ingresos_mensuales: simPersonal.cuota_mensual ? Math.round(simPersonal.cuota_mensual / 0.35) : null,
              lead_deudas_mensuales: 0,
              lead_preferencia_llamada: preferencia,
              meta_dni_nie: dniNie,
              meta_antiguedad_trabajo: antiguedad,
              meta_en_fichero_morosidad: null,
              meta_rango_ingresos: null,
              meta_deudas_mensuales: 0,
              meta_tiene_ahorros: ahorros,
              meta_monto_ahorros: 0,
              meta_vivienda_seleccionada: viviendaSel,
              agente_id: agent.id,
              agente_nombre: agent.nombre,
              agente_email: agent.email,
              agente_telefono: agent.telefono || null,
              sim_personal_monto_maximo: simPersonal.monto_maximo || 0,
              sim_personal_cuota_mensual: simPersonal.cuota_mensual || 0,
              sim_personal_plazo_meses: simPersonal.plazo_meses || 0,
              sim_personal_tae: simPersonal.tae_estimada || 0,
              sim_personal_aprobado: simPersonal.aprobado || false,
              sim_hipoteca_monto_financiable: simHipoteca.monto_maximo_financiable || 0,
              sim_hipoteca_valor_max_inmueble: simHipoteca.valor_maximo_inmueble || 0,
              sim_hipoteca_cuota_maxima: simHipoteca.cuota_maxima_mensual || 0,
              sim_hipoteca_capital_necesario: simHipoteca.capital_necesario || 0,
              sim_hipoteca_plazo_anos: simHipoteca.plazo_anos || 0,
              sim_hipoteca_tae: simHipoteca.tae_estimada || 0,
              sim_hipoteca_aprobable: simHipoteca.aprobado || false,
              recom_1_titulo: recom[0]?.titulo || (recom[0] ? `${recom[0]?.quartos || '?'} hab en ${recom[0]?.ciudad}` : null),
              recom_1_precio: recom[0]?.precio || null,
              recom_1_url: recom[0]?.id ? `https://inventariotuhogarposible.vercel.app/produto/${recom[0].id}` : null,
              recom_2_titulo: recom[1]?.titulo || (recom[1] ? `${recom[1]?.quartos || '?'} hab en ${recom[1]?.ciudad}` : null),
              recom_2_precio: recom[1]?.precio || null,
              recom_2_url: recom[1]?.id ? `https://inventariotuhogarposible.vercel.app/produto/${recom[1].id}` : null,
              recom_3_titulo: recom[2]?.titulo || (recom[2] ? `${recom[2]?.quartos || '?'} hab en ${recom[2]?.ciudad}` : null),
              recom_3_precio: recom[2]?.precio || null,
              recom_3_url: recom[2]?.id ? `https://inventariotuhogarposible.vercel.app/produto/${recom[2].id}` : null,
              crm_url: `https://tu-hogar-vista.lovable.app/agente/crm?lead=${lead.id}`
            };

            const resp = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bitrixPayload)
            });

            webhookStatus = resp.ok ? 'success' : `error_${resp.status}`;

            await supabase.from('webhook_logs').insert({
              webhook_url: webhookUrl + ' (fix_retroactive)',
              status: resp.ok ? 'success' : 'error',
              error_message: !resp.ok ? `HTTP ${resp.status}` : null,
              payload: bitrixPayload
            });
          } catch (whErr) {
            webhookStatus = 'exception';
            console.error(`[fix-unassigned] Webhook error for ${lead.id}:`, whErr);
          }
        }

        results.push({
          lead_id: lead.id,
          nombre: lead.nombre_completo,
          zona: lead.zona_interes,
          region_detected: region || 'fallback',
          agente: agent.nombre,
          webhook: webhookStatus,
          status: 'assigned'
        });

        // Small delay to avoid rate limiting on Make.com
        await new Promise(r => setTimeout(r, 500));

      } catch (leadErr) {
        console.error(`[fix-unassigned] Error processing lead ${lead.id}:`, leadErr);
        results.push({ lead_id: lead.id, nombre: lead.nombre_completo, status: 'error', error: leadErr.message });
      }
    }

    const summary = {
      total_leads: leads.length,
      assigned: results.filter(r => r.status === 'assigned').length,
      errors: results.filter(r => r.status !== 'assigned').length,
      details: results
    };

    console.log(`[fix-unassigned] Complete: ${summary.assigned}/${summary.total_leads} assigned`);

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[fix-unassigned] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
