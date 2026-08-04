// ============================================================================
// fix-reunion-dates — corrige reuniones incoerentes (hora de madrugada,
// fecha pasada, fin de semana o fecha fuera de horizonte) re-parseando
// `hora_reunion_texto` con el parser corregido y respetando la disponibilidad
// del agente asignado (sin solapes).
//
// POST { dry_run?: boolean, since?: 'YYYY-MM-DD' }
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { parseReunionDateTime } from '../_shared/parseReunionDateTime.ts';

const TZ = 'Europe/Madrid';
const WORK_START = 8;
const WORK_END = 20;

function madridParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
  };
}

function madridOffsetMinutes(utcMs: number): number {
  const d = new Date(utcMs);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return (asUtc - utcMs) / 60000;
}

function madridToIso(fecha: string, hora: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm || 0, 0);
  for (let i = 0; i < 2; i++) {
    const off = madridOffsetMinutes(guess);
    guess = Date.UTC(y, m - 1, d, hh, mm || 0, 0) - off * 60000;
  }
  return new Date(guess).toISOString();
}

function isoWeekday(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dom
}

function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    const since = body.since ?? '2026-08-01';

    // ---- SALVAGUARDAS (evitan reagendar leads históricos por error) ----
    // 1) Nunca se puede tocar histórico: `since` no puede ser anterior a hoy - 7 días.
    // 2) Cualquier escritura real exige `confirm: "SI"` además de dry_run:false.
    const now = new Date();
    const nowM = madridParts(now);
    const minYmd = addDaysYmd(nowM.ymd, 1); // a partir de mañana
    const floorSince = addDaysYmd(nowM.ymd, -7);

    if (since < floorSince) {
      return new Response(
        JSON.stringify({
          error: 'since_too_old',
          message: `Por seguridad, "since" no puede ser anterior a ${floorSince}. Esta función solo corrige leads recientes/futuros.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!dryRun && body.confirm !== 'SI') {
      return new Response(
        JSON.stringify({
          error: 'confirmation_required',
          message: 'Para aplicar cambios reales envía { "dry_run": false, "confirm": "SI" }.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }


    // ------------------------------------------------------------------
    // MODO RESTORE: devuelve a su fecha histórica los leads antiguos que
    // fueron reagendados por error (re-parseando su texto con base en su
    // fecha de creación, que es como se calcularon originalmente).
    // ------------------------------------------------------------------
    if (body.mode === 'restore') {
      const { data: rows, error: rErr } = await supabase
        .from('leads')
        .select('id, nombre_completo, created_at, updated_at, reunion_datetime, hora_reunion_texto')
        .lt('created_at', body.restore_before ?? '2026-08-01')
        .gte('updated_at', body.updated_after ?? new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .gte('reunion_datetime', '2026-08-05T00:00:00Z')
        .limit(3000);
      if (rErr) throw rErr;

      const restored: any[] = [];
      for (const r of rows ?? []) {
        const p = parseReunionDateTime(r.hora_reunion_texto ?? '', new Date(r.created_at));
        if (!p.fecha) continue;
        const hora = p.hora ?? '11:00:00';
        restored.push({
          id: r.id,
          nombre: r.nombre_completo,
          antes: r.reunion_datetime,
          fecha: p.fecha,
          hora,
          iso: madridToIso(p.fecha, hora),
        });
      }

      if (!dryRun) {
        for (let i = 0; i < restored.length; i += 25) {
          await Promise.all(restored.slice(i, i + 25).map((c) =>
            supabase.from('leads')
              .update({ reunion_datetime: c.iso, fecha_reunion: c.fecha, hora_reunion: c.hora })
              .eq('id', c.id)
          ));
        }
      }

      return new Response(
        JSON.stringify({ mode: 'restore', dry_run: dryRun, total: restored.length, sample: restored.slice(0, 5) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }


    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, nombre_completo, stage, agente_asignado_id, reunion_datetime, hora_reunion_texto')
      .gte('created_at', since)
      .not('reunion_datetime', 'is', null)
      .limit(2000);
    if (error) throw error;

    // Disponibilidad de agentes
    const { data: avail } = await supabase
      .from('agent_availability')
      .select('agent_id, weekday, start_time, end_time');
    const availByAgent = new Map<string, { weekday: number; start: number; end: number }[]>();
    for (const a of avail ?? []) {
      const list = availByAgent.get(a.agent_id) ?? [];
      list.push({
        weekday: a.weekday,
        start: Number(String(a.start_time).slice(0, 2)),
        end: Number(String(a.end_time).slice(0, 2)),
      });
      availByAgent.set(a.agent_id, list);
    }

    // Reuniones ya ocupadas por agente (futuras)
    const { data: booked } = await supabase
      .from('leads')
      .select('id, agente_asignado_id, reunion_datetime')
      .not('reunion_datetime', 'is', null)
      .not('agente_asignado_id', 'is', null)
      .gte('reunion_datetime', now.toISOString())
      .limit(5000);
    const taken = new Set<string>();
    for (const b of booked ?? []) {
      const p = madridParts(new Date(b.reunion_datetime));
      taken.add(`${b.agente_asignado_id}|${p.ymd}|${p.hour}`);
    }

    const fits = (agentId: string | null, ymd: string, hour: number) => {
      const dow = isoWeekday(ymd);
      if (dow === 0 || dow === 6) return false;
      if (hour < WORK_START || hour >= WORK_END) return false;
      if (!agentId) return true;
      const slots = availByAgent.get(agentId);
      if (slots && slots.length > 0) {
        const ok = slots.some((s) => s.weekday === dow && hour >= s.start && hour < s.end);
        if (!ok) return false;
      }
      return !taken.has(`${agentId}|${ymd}|${hour}`);
    };

    const changes: any[] = [];
    const skipped: any[] = [];

    for (const lead of leads ?? []) {
      const cur = madridParts(new Date(lead.reunion_datetime));
      const bad =
        cur.ymd < minYmd ||
        cur.hour < WORK_START ||
        cur.hour >= WORK_END ||
        [0, 6].includes(isoWeekday(cur.ymd)) ||
        cur.ymd > addDaysYmd(nowM.ymd, 90);
      if (!bad) continue;

      const parsed = parseReunionDateTime(lead.hora_reunion_texto ?? '', now);
      let ymd = parsed.fecha && parsed.fecha >= minYmd ? parsed.fecha : minYmd;
      let hour = parsed.hora ? Number(parsed.hora.slice(0, 2)) : 11;
      const minute = parsed.hora ? Number(parsed.hora.slice(3, 5)) : 0;

      // busca el primer hueco válido: mismo día/hora, luego horas del día, luego días siguientes
      let found: { ymd: string; hour: number } | null = null;
      outer:
      for (let dayOff = 0; dayOff < 30; dayOff++) {
        const day = addDaysYmd(ymd, dayOff);
        const hourOrder = [hour, ...Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i)];
        for (const h of hourOrder) {
          if (fits(lead.agente_asignado_id, day, h)) { found = { ymd: day, hour: h }; break outer; }
        }
      }
      if (!found) { skipped.push({ id: lead.id, nombre: lead.nombre_completo, motivo: 'sin hueco' }); continue; }

      const newHora = `${String(found.hour).padStart(2, '0')}:${String(found.hour === hour ? minute : 0).padStart(2, '0')}:00`;
      const iso = madridToIso(found.ymd, newHora);

      if (lead.agente_asignado_id) taken.add(`${lead.agente_asignado_id}|${found.ymd}|${found.hour}`);

      changes.push({
        id: lead.id,
        nombre: lead.nombre_completo,
        stage: lead.stage,
        texto: lead.hora_reunion_texto,
        antes: `${cur.ymd} ${String(cur.hour).padStart(2, '0')}:${String(cur.minute).padStart(2, '0')}`,
        despues: `${found.ymd} ${newHora.slice(0, 5)}`,
        iso,
        fecha: found.ymd,
        hora: newHora,
      });
    }

    if (!dryRun) {
      for (let i = 0; i < changes.length; i += 25) {
        const chunk = changes.slice(i, i + 25);
        await Promise.all(chunk.map((c) =>
          supabase
            .from('leads')
            .update({ reunion_datetime: c.iso, fecha_reunion: c.fecha, hora_reunion: c.hora })
            .eq('id', c.id)
        ));
      }
    }

    return new Response(
      JSON.stringify({ dry_run: dryRun, total: changes.length, skipped, changes: body.verbose ? changes : changes.slice(0, 5) }),

      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
