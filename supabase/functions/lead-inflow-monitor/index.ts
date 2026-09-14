// ============================================================================
// lead-inflow-monitor
// Vigila la llegada de leads (Meta Ads / Tally). Si pasa demasiado tiempo sin
// ningún lead nuevo durante el horario activo (Europe/Madrid), avisa a los
// admins con una notificación y deja registro en webhook_logs.
// Pensado para ejecutarse cada hora vía pg_cron.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_GAP_HOURS = 3;
const ACTIVE_FROM_HOUR = 7;   // hora Madrid
const ACTIVE_TO_HOUR = 23;    // hora Madrid (exclusivo)
const ALERT_COOLDOWN_HOURS = 3;

function madridHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false,
    }).format(d),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({} as any));
    const force = body?.force === true;

    // Umbral configurable en admin_settings
    const { data: setting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'lead_inflow_alert_hours')
      .maybeSingle();
    const gapHours = Math.max(Number(setting?.value) || DEFAULT_GAP_HOURS, 1);

    const now = new Date();
    const hour = madridHour(now);
    if (!force && (hour < ACTIVE_FROM_HOUR || hour >= ACTIVE_TO_HOUR)) {
      return new Response(JSON.stringify({ skipped: 'fuera de horario activo', hour }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: lastLead } = await supabase
      .from('leads')
      .select('id, created_at, source')
      .in('source', ['meta_ads', 'tally'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastAt = lastLead?.created_at ? new Date(lastLead.created_at) : null;
    const gap = lastAt ? (now.getTime() - lastAt.getTime()) / 36e5 : Infinity;

    if (gap < gapHours && !force) {
      return new Response(JSON.stringify({ ok: true, alert: false, gap_hours: Number(gap.toFixed(2)) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Evitar spam: no repetir aviso dentro del cooldown
    const since = new Date(now.getTime() - ALERT_COOLDOWN_HOURS * 36e5).toISOString();
    const { data: recentAlert } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'lead_inflow_alert')
      .gte('created_at', since)
      .limit(1);

    if (recentAlert && recentAlert.length > 0 && !force) {
      return new Response(JSON.stringify({ ok: true, alert: false, reason: 'cooldown' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const horas = gap === Infinity ? 'más de 90 días' : `${Math.floor(gap)} h`;
    const mensaje = `No se ha registrado ningún lead de Meta Ads / Tally desde hace ${horas}. ` +
      `Revisa el escenario de Make.com y la entrega de leads de Meta.`;

    await supabase.rpc('notify_admins', {
      p_type: 'lead_inflow_alert',
      p_title: 'Sin leads entrantes',
      p_message: mensaje,
      p_link: '/admin/crm',
      p_metadata: {
        gap_hours: gap === Infinity ? null : Number(gap.toFixed(2)),
        last_lead_at: lastAt?.toISOString() ?? null,
        threshold_hours: gapHours,
      },
    });

    await supabase.from('webhook_logs').insert({
      webhook_url: 'lead-inflow-monitor (alerta)',
      status: 'error',
      error_message: mensaje,
      payload: { gap_hours: gap === Infinity ? null : gap, last_lead_at: lastAt?.toISOString() ?? null },
    });

    return new Response(JSON.stringify({ ok: true, alert: true, gap_hours: gap === Infinity ? null : gap }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[lead-inflow-monitor]', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
