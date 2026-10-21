// lead-documentacion-ok (20/10/2026)
// Cuando un lead entra en la etapa "Documentación OK", el trigger de la tabla leads llama a esta función,
// que envía los datos al escenario Make "Documentación OK a Inmolender" (Google Sheet "cualificados a inmolender").
// Usa el mismo builder de payload que meta-lead-webhook, así la hoja recibe exactamente los mismos campos que antes.
// Entrada (POST JSON): { secret, lead_id }  · secret = admin_settings.inmolender_trigger_secret
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildBitrixPayloadFromLead } from '../_shared/bitrixPayload.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const body = await req.json().catch(() => ({}));
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: cfgRows } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['inmolender_trigger_secret', 'webhook_inmolender_url']);
  const cfg = Object.fromEntries((cfgRows || []).map((r: any) => [r.key, String(r.value || '').trim()]));
  if (!cfg.inmolender_trigger_secret || body?.secret !== cfg.inmolender_trigger_secret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const log = async (status: string, msg: string | null, payload: Record<string, unknown>) => {
    try {
      await supabase.from('webhook_logs').insert({ webhook_url: 'lead-documentacion-ok', status, error_message: msg, payload });
    } catch { /* no bloquear */ }
  };

  if (!cfg.webhook_inmolender_url) {
    await log('error', 'webhook_inmolender_url vacío', { lead_id: body?.lead_id });
    return json({ ok: false, error: 'sin_webhook' }, 500);
  }

  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', body?.lead_id).maybeSingle();
  if (error || !lead) {
    await log('error', error?.message || 'lead_no_encontrado', { lead_id: body?.lead_id });
    return json({ ok: false, error: 'lead_no_encontrado' }, 404);
  }

  const payload = buildBitrixPayloadFromLead({ lead, source: 'documentacion_ok' });
  const r = await fetch(cfg.webhook_inmolender_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const txt = (await r.text()).slice(0, 300);
  await log(r.ok ? 'success' : 'error', r.ok ? null : `${r.status} ${txt}`, { lead_id: lead.id });
  return json({ ok: r.ok, status: r.status });
});
