import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Determina el turno actual basado en la hora de España
 * Mañana: 08:00-14:00
 * Tarde: 14:00-20:00
 * Noche: 20:00-08:00
 */
function getTurnoActual(): string {
  // Obtener hora actual en España (Europe/Madrid)
  const now = new Date();
  const madridTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const hora = madridTime.getHours();
  
  if (hora >= 8 && hora < 14) {
    return 'mañana';
  } else if (hora >= 14 && hora < 20) {
    return 'tarde';
  } else {
    return 'noche';
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { region, considerarTurno = true, turnoOverride } = await req.json()

    // Validar região
    if (!region || !['Cataluña', 'General'].includes(region)) {
      return new Response(
        JSON.stringify({ error: 'Región inválida. Use "Cataluña" o "General"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CORREÇÃO: Só filtrar por turno se o lead especificou preferência (turnoOverride)
    // Se não há preferência, usar round-robin puro com TODOS os agentes ativos
    const deveConsiderarTurno = considerarTurno && !!turnoOverride;
    const turnoParaFiltrar = turnoOverride || null;
    
    console.log(`[Round-Robin] Región: ${region}, TurnoOverride: ${turnoOverride || 'none'}, Filtrar por turno: ${deveConsiderarTurno}`);

    // 1. Buscar agentes disponíveis da região (CORREÇÃO: removido filtro de tidycal_url)
    let query = supabaseAdmin
      .from('profiles')
      .select('id, nombre, email, tidycal_url, telefono, disponibilidad')
      .eq('activo', true)
      .eq('region_round_robin', region)
      .order('nombre');

    const { data: allAgents, error: agentsError } = await query;

    if (agentsError) throw agentsError;

    if (!allAgents || allAgents.length === 0) {
      console.warn('[Round-Robin] No agents available for region');
      return new Response(
        JSON.stringify({ 
          error: `No hay agentes disponibles para la región ${region}. Por favor, contacte al administrador.` 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Filtrar por turno APENAS se lead especificou preferência de horário
    let agents = allAgents;
    
    if (deveConsiderarTurno && turnoParaFiltrar) {
      agents = allAgents.filter(agent => {
        const disponibilidad = agent.disponibilidad || ['mañana', 'tarde', 'noche'];
        return disponibilidad.includes(turnoParaFiltrar);
      });
      
      // Fallback: se nenhum agente disponível no turno preferido, usar todos
      if (agents.length === 0) {
        console.warn(`[Round-Robin] No agents available in turno ${turnoParaFiltrar}, using all agents`);
        agents = allAgents;
      }
      
      console.log(`[Round-Robin] Agents após filtro turno ${turnoParaFiltrar}: ${agents.length}`);
    } else {
      console.log(`[Round-Robin] Round-robin puro (sem filtro de turno): ${agents.length} agentes`);
    }

    console.log(`[Round-Robin] Agents disponíveis: ${agents.length} de ${allAgents.length}`);

    // 3. Buscar último agente designado
    const { data: tracking, error: trackingError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .select('last_assigned_agent_id')
      .eq('region', region)
      .single()

    if (trackingError && trackingError.code !== 'PGRST116') throw trackingError;

    // 4. Calcular próximo agente (round-robin)
    let nextAgentIndex = 0
    
    if (tracking?.last_assigned_agent_id) {
      const lastIndex = agents.findIndex(a => a.id === tracking.last_assigned_agent_id)
      // Se encontrou o último, pega o próximo; senão, começa do primeiro
      nextAgentIndex = lastIndex >= 0 ? (lastIndex + 1) % agents.length : 0
    }

    const nextAgent = agents[nextAgentIndex]

    console.log(`[Round-Robin] Próximo agente: ${nextAgent.nombre} (turno: ${turnoActual})`);

    // 5. Atualizar tracking
    const { error: updateError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .upsert({
        region,
        last_assigned_agent_id: nextAgent.id,
        last_assignment_at: new Date().toISOString()
      }, { onConflict: 'region' })

    if (updateError) {
      console.error('[Round-Robin] Tracking update failed:', updateError)
    }

    // 6. Retornar dados do agente (formato agente para compatibilidade)
    return new Response(
      JSON.stringify({
        agent_id: nextAgent.id,
        tidycal_url: nextAgent.tidycal_url,
        nombre: nextAgent.nombre,
        telefono: nextAgent.telefono,
        email: nextAgent.email,
        turno_asignado: turnoActual,
        // Formato alternativo para meta-lead-webhook
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
    console.error('[Round-Robin] Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error al asignar agente' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
