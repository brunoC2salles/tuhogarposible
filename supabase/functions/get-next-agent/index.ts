import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Get-next-agent: elige el próximo agente por disponibilidad horaria semanal.
 *
 * Input JSON:
 *  - reunion_datetime (string ISO opcional): fecha/hora de la reunión del lead.
 *  - Legacy: region, considerarTurno, turnoOverride (ya no se usan pero se aceptan).
 *
 * Estrategia:
 *  1. Cargar agentes activos (excluye Housage).
 *  2. Si hay reunion_datetime: filtrar por agentes cuya disponibilidad
 *     (agent_availability) contiene ese momento (día de la semana + hora en Europe/Madrid).
 *  3. Si no hay reunion_datetime o nadie coincide: usar todos los agentes activos.
 *  4. Round-robin global con un único cursor en agent_assignment_tracking (region='global').
 */

interface AgentRow {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
}

interface AvailabilityRow {
  agent_id: string;
  weekday: number;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
}

/** Devuelve { weekday: 0..6 (Mon..Sun), minutes: 0..1439 } en Europe/Madrid */
function madridWeekdayAndMinutes(iso: string): { weekday: number; minutes: number } | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // formatToParts en Europe/Madrid
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const wdStr = parts.find(p => p.type === 'weekday')?.value ?? 'Mon';
  const hh = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const mm = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const weekday = map[wdStr] ?? 0;
  return { weekday, minutes: hh * 60 + mm };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const reunion_datetime: string | undefined = body?.reunion_datetime;

    console.log('[Round-Robin] reunion_datetime:', reunion_datetime || 'none');

    const HOUSAGE_AGENT_ID = 'fa5038e7-0e88-49c7-88ae-ac506e12340b';

    // 1. Todos los agentes activos (excluye Housage)
    const { data: allAgents, error: agentsError } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre, email, telefono')
      .eq('activo', true)
      .eq('role', 'agente')
      .neq('id', HOUSAGE_AGENT_ID)
      .order('nombre');

    if (agentsError) throw agentsError;

    if (!allAgents || allAgents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay agentes disponibles. Contacte al administrador.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let candidates: AgentRow[] = allAgents as AgentRow[];

    // 1b. Boost manual: prioridad temporal de un agente
    try {
      const { data: boosts, error: boostErr } = await supabaseAdmin
        .from('agent_assignment_boost')
        .select('id, agent_id, remaining, expires_at, mode, next_is_boost')
        .gt('remaining', 0)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (boostErr) {
        console.error('[Boost] Error cargando boosts:', boostErr);
      } else if (boosts && boosts.length > 0) {
        const boost = boosts[0] as any;
        const boosted = (allAgents as AgentRow[]).find((a) => a.id === boost.agent_id);
        const isAlternate = boost.mode === 'alternate';

        if (!boosted) {
          console.warn('[Boost] Agente con boost no está activo; se ignora.');
        } else if (isAlternate && boost.next_is_boost === false) {
          // Turno del reparto normal: solo alternamos el turno y seguimos con round-robin
          const { error: turnErr } = await supabaseAdmin
            .from('agent_assignment_boost')
            .update({ next_is_boost: true })
            .eq('id', boost.id)
            .eq('next_is_boost', false);
          if (turnErr) console.error('[Boost/alternate] Error alternando turno:', turnErr);
          console.log('[Boost/alternate] Turno round-robin');
        } else {
          const updatePayload: Record<string, unknown> = { remaining: boost.remaining - 1 };
          if (isAlternate) updatePayload.next_is_boost = false;

          let dec = supabaseAdmin
            .from('agent_assignment_boost')
            .update(updatePayload)
            .eq('id', boost.id)
            .eq('remaining', boost.remaining);
          if (isAlternate) dec = dec.eq('next_is_boost', true);

          const { error: decErr } = await dec;

          if (decErr) {
            console.error('[Boost] Error decrementando boost:', decErr);
          } else {
            console.log(
              `[Boost${isAlternate ? '/alternate' : ''}] Turno agente: ${boosted.nombre}, quedan ${boost.remaining - 1}`,
            );
            return new Response(
              JSON.stringify({
                agent_id: boosted.id,
                nombre: boosted.nombre,
                telefono: boosted.telefono,
                email: boosted.email,
                boosted: true,
                agente: {
                  id: boosted.id,
                  nombre: boosted.nombre,
                  email: boosted.email,
                  telefono: boosted.telefono,
                },
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }
      }
    } catch (e) {
      console.error('[Boost] Excepción:', e);
    }


    // 2. Si tenemos reunion_datetime, filtrar por disponibilidad
    if (reunion_datetime) {
      const wm = madridWeekdayAndMinutes(reunion_datetime);
      if (wm) {
        const { data: availability, error: availError } = await supabaseAdmin
          .from('agent_availability')
          .select('agent_id, weekday, start_time, end_time')
          .eq('weekday', wm.weekday);

        if (availError) {
          console.error('[Round-Robin] Error cargando disponibilidad:', availError);
        } else {
          const matchingIds = new Set(
            (availability as AvailabilityRow[])
              .filter((a) => {
                const s = timeToMinutes(a.start_time);
                const e = timeToMinutes(a.end_time);
                return wm.minutes >= s && wm.minutes < e;
              })
              .map((a) => a.agent_id),
          );
          const filtered = candidates.filter((a) => matchingIds.has(a.id));
          console.log(`[Round-Robin] weekday=${wm.weekday} min=${wm.minutes} disponibles=${filtered.length}/${candidates.length}`);
          if (filtered.length > 0) {
            candidates = filtered;
          } else {
            console.warn('[Round-Robin] Nadie disponible en ese horario, usando pool global.');
          }
        }
      }

      // 2b. Excluir agentes que ya tienen un lead exactamente en ese reunion_datetime
      try {
        const target = new Date(reunion_datetime);
        if (!isNaN(target.getTime())) {
          // Ventana de ±1 minuto para absorber ms/precisión
          const from = new Date(target.getTime() - 60 * 1000).toISOString();
          const to = new Date(target.getTime() + 60 * 1000).toISOString();
          const { data: conflictLeads, error: conflictErr } = await supabaseAdmin
            .from('leads')
            .select('agente_asignado_id, reunion_datetime')
            .not('agente_asignado_id', 'is', null)
            .gte('reunion_datetime', from)
            .lte('reunion_datetime', to);

          if (conflictErr) {
            console.error('[Round-Robin] Error comprobando conflictos:', conflictErr);
          } else if (conflictLeads && conflictLeads.length > 0) {
            const busy = new Set(conflictLeads.map((l: any) => l.agente_asignado_id));
            const free = candidates.filter((a) => !busy.has(a.id));
            console.log(`[Round-Robin] ocupados=${busy.size} libres=${free.length}/${candidates.length}`);
            if (free.length > 0) {
              candidates = free;
            } else {
              console.warn('[Round-Robin] Todos ocupados en ese slot; se mantiene pool para no fallar la asignación.');
            }
          }
        }
      } catch (e) {
        console.error('[Round-Robin] Excepción comprobando conflictos:', e);
      }
    }

    // 3. Round-robin global
    const trackingKey = 'global';
    const { data: tracking, error: trackingError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .select('last_assigned_agent_id')
      .eq('region', trackingKey)
      .maybeSingle();

    if (trackingError && trackingError.code !== 'PGRST116') {
      console.error('[Round-Robin] tracking select error:', trackingError);
    }

    let nextIndex = 0;
    if (tracking?.last_assigned_agent_id) {
      const lastIndex = candidates.findIndex((a) => a.id === tracking.last_assigned_agent_id);
      nextIndex = lastIndex >= 0 ? (lastIndex + 1) % candidates.length : 0;
    }

    const nextAgent = candidates[nextIndex];
    console.log(`[Round-Robin] Elegido: ${nextAgent.nombre}`);

    const { error: updateError } = await supabaseAdmin
      .from('agent_assignment_tracking')
      .upsert(
        {
          region: trackingKey,
          last_assigned_agent_id: nextAgent.id,
          last_assignment_at: new Date().toISOString(),
        },
        { onConflict: 'region' },
      );
    if (updateError) console.error('[Round-Robin] tracking update failed:', updateError);

    return new Response(
      JSON.stringify({
        agent_id: nextAgent.id,
        nombre: nextAgent.nombre,
        telefono: nextAgent.telefono,
        email: nextAgent.email,
        agente: {
          id: nextAgent.id,
          nombre: nextAgent.nombre,
          email: nextAgent.email,
          telefono: nextAgent.telefono,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[Round-Robin] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Error al asignar agente' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
