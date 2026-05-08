import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Determina el turno actual basado en la hora de España
 */
function getTurnoActual(): string {
  const now = new Date();
  const madridTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const hora = madridTime.getHours();
  
  if (hora >= 8 && hora < 14) return 'mañana';
  else if (hora >= 14 && hora < 20) return 'tarde';
  else return 'noche';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { region, considerarTurno = true, turnoOverride } = await req.json()

    // region is now a specific comunidad autónoma (e.g. "Cataluña") or null
    console.log(`[Round-Robin] Región solicitada: ${region || 'null'}, TurnoOverride: ${turnoOverride || 'none'}`);

    // Housage está reservado exclusivamente ao funil Tally — nunca entra no round-robin
    const HOUSAGE_AGENT_ID = 'fa5038e7-0e88-49c7-88ae-ac506e12340b';

    // 1. Buscar TODOS los agentes activos
    const { data: rawAgents, error: agentsError } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre, email, tidycal_url, telefono, disponibilidad, region_round_robin')
      .eq('activo', true)
      .neq('id', HOUSAGE_AGENT_ID)
      .order('nombre');

    if (agentsError) throw agentsError;

    const allAgents = rawAgents;
    console.log(`[Round-Robin] Agentes activos totales (Housage excluído do pool): ${allAgents?.length || 0}`);

    if (!allAgents || allAgents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay agentes disponibles. Contacte al administrador.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Filtrar agentes por región
    let agents: typeof allAgents = [];
    let regionTracking = region || 'unknown'; // Para el tracking de round-robin

    if (region) {
      // Filtrar agentes que tengan esta comunidad autónoma en su array
      agents = allAgents.filter(a => 
        a.region_round_robin && Array.isArray(a.region_round_robin) && a.region_round_robin.includes(region)
      );
      console.log(`[Round-Robin] Agentes con región "${region}": ${agents.length}`);
    }

    // FALLBACK: Si no hay agentes para la región (o región desconocida),
    // seleccionar agentes con MÁS regiones (mayor cobertura)
    if (agents.length === 0) {
      console.warn(`[Round-Robin] Sin agentes para región "${region}". Usando fallback por cobertura.`);
      regionTracking = 'fallback';
      
      // Ordenar por cantidad de regiones (mayor cobertura primero)
      agents = allAgents
        .filter(a => a.region_round_robin && Array.isArray(a.region_round_robin) && a.region_round_robin.length > 0)
        .sort((a, b) => (b.region_round_robin?.length || 0) - (a.region_round_robin?.length || 0));
      
      // Si aún no hay agentes con regiones, usar TODOS los activos
      if (agents.length === 0) {
        console.warn('[Round-Robin] Ningún agente tiene regiones configuradas. Usando todos los activos.');
        agents = allAgents;
      }
    }

    // 3. Filtrar por turno SOLO si el lead especificó preferencia
    const deveConsiderarTurno = considerarTurno && !!turnoOverride;
    
    if (deveConsiderarTurno && turnoOverride) {
      const agentsTurno = agents.filter(agent => {
        const disponibilidad = agent.disponibilidad || ['mañana', 'tarde', 'noche'];
        return disponibilidad.includes(turnoOverride);
      });
      
      if (agentsTurno.length > 0) {
        agents = agentsTurno;
        console.log(`[Round-Robin] Filtro turno ${turnoOverride}: ${agents.length} agentes`);
      } else {
        console.warn(`[Round-Robin] Sin agentes en turno ${turnoOverride}, manteniendo todos`);
      }
    }

    console.log(`[Round-Robin] Agentes finales: ${agents.length}`);

    // 4. Buscar último agente designado para esta región de tracking
    const { data: tracking, error: trackingError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .select('last_assigned_agent_id')
      .eq('region', regionTracking)
      .single()

    if (trackingError && trackingError.code !== 'PGRST116') throw trackingError;

    // 5. Calcular próximo agente (round-robin)
    let nextAgentIndex = 0
    
    if (tracking?.last_assigned_agent_id) {
      const lastIndex = agents.findIndex(a => a.id === tracking.last_assigned_agent_id)
      nextAgentIndex = lastIndex >= 0 ? (lastIndex + 1) % agents.length : 0
    }

    const nextAgent = agents[nextAgentIndex]

    console.log(`[Round-Robin] Próximo agente: ${nextAgent.nombre} (tracking: ${regionTracking})`);

    // 6. Actualizar tracking
    const { error: updateError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .upsert({
        region: regionTracking,
        last_assigned_agent_id: nextAgent.id,
        last_assignment_at: new Date().toISOString()
      }, { onConflict: 'region' })

    if (updateError) {
      console.error('[Round-Robin] Tracking update failed:', updateError)
    }

    // 7. Retornar datos del agente
    return new Response(
      JSON.stringify({
        agent_id: nextAgent.id,
        tidycal_url: nextAgent.tidycal_url,
        nombre: nextAgent.nombre,
        telefono: nextAgent.telefono,
        email: nextAgent.email,
        turno_asignado: turnoOverride || 'cualquiera',
        agente: {
          id: nextAgent.id,
          nombre: nextAgent.nombre,
          email: nextAgent.email,
          telefono: nextAgent.telefono,
          tidycal_url: nextAgent.tidycal_url
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Round-Robin] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error al asignar agente' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
