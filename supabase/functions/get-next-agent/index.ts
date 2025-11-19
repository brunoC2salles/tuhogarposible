import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

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

    const { region } = await req.json()

    // Validar região
    if (!region || !['Cataluña', 'General'].includes(region)) {
      return new Response(
        JSON.stringify({ error: 'Región inválida. Use "Cataluña" o "General"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Round-Robin] Buscando agente para región: ${region}`)

    // 1. Buscar agentes disponíveis da região
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre, email, tidycal_url, telefono')
      .eq('activo', true)
      .eq('region_round_robin', region)
      .not('tidycal_url', 'is', null)
      .order('nombre')

    if (agentsError) throw agentsError

    if (!agents || agents.length === 0) {
      console.error(`[Round-Robin] No hay agentes disponibles para ${region}`)
      return new Response(
        JSON.stringify({ 
          error: `No hay agentes disponibles para la región ${region}. Por favor, contacte al administrador.` 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Round-Robin] Encontrados ${agents.length} agentes para ${region}`)

    // 2. Buscar último agente designado
    const { data: tracking, error: trackingError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .select('last_assigned_agent_id')
      .eq('region', region)
      .single()

    if (trackingError) throw trackingError

    // 3. Calcular próximo agente (round-robin)
    let nextAgentIndex = 0
    
    if (tracking?.last_assigned_agent_id) {
      const lastIndex = agents.findIndex(a => a.id === tracking.last_assigned_agent_id)
      // Se encontrou o último, pega o próximo; senão, começa do primeiro
      nextAgentIndex = lastIndex >= 0 ? (lastIndex + 1) % agents.length : 0
    }

    const nextAgent = agents[nextAgentIndex]

    console.log(`[Round-Robin] Agente selecionado: ${nextAgent.nombre} (${nextAgent.email})`)

    // 4. Atualizar tracking
    const { error: updateError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .update({
        last_assigned_agent_id: nextAgent.id,
        last_assignment_at: new Date().toISOString()
      })
      .eq('region', region)

    if (updateError) {
      console.error('[Round-Robin] Erro ao atualizar tracking:', updateError)
      // Não bloqueia a resposta, apenas loga
    }

    // 5. Retornar dados do agente
    return new Response(
      JSON.stringify({
        agent_id: nextAgent.id,
        tidycal_url: nextAgent.tidycal_url,
        nombre: nextAgent.nombre,
        telefono: nextAgent.telefono
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
