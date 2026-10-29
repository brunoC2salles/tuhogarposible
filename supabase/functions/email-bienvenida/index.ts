// email-bienvenida — usada por el escenario Make "Email bienvenida 24h" (decisión Bruno 29/10/2026).
// Los leads cualificados reciben un email de bienvenida 24h después de su alta en el CRM
// (cuando ya recibieron los primeros WhatsApp), tengan o no vivienda.
// Entrada (POST JSON): { secret, action: "pendientes" } -> { ok, leads: [{ id, nombre, email }] }
//                      { secret, action: "marcar", lead_id } -> { ok, updated }
// Pendiente = creado desde admin_settings.email_bienvenida_desde, hace 24h o más, no descualificado,
// no archivado, con email y sin email_bienvenida_enviado_at.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'json_invalido' }, 400); }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: ajustes } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['email_bienvenida_secret', 'email_bienvenida_desde']);
  const ajuste = (k: string) => String(ajustes?.find((a: any) => a.key === k)?.value || '').trim();

  const secret = ajuste('email_bienvenida_secret');
  if (!secret || body?.secret !== secret) return json({ ok: false, error: 'unauthorized' }, 401);

  const action = String(body?.action || '');

  if (action === 'pendientes') {
    const desde = ajuste('email_bienvenida_desde');
    if (!desde) return json({ ok: false, error: 'sin_fecha_inicio' }, 500);
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('leads')
      .select('id, nombre_completo, email')
      .gte('created_at', desde)
      .lte('created_at', hace24h)
      .neq('stage', 'descualificados')
      .is('archivado_at', null)
      .is('email_bienvenida_enviado_at', null)
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) return json({ ok: false, error: 'db_error', message: error.message }, 500);

    const leads = (data || [])
      .map((l: any) => ({ id: l.id, nombre: l.nombre_completo || '', email: String(l.email || '').trim() }))
      .filter((l) => EMAIL_RE.test(l.email));
    return json({ ok: true, total: leads.length, leads });
  }

  if (action === 'marcar') {
    const leadId = String(body?.lead_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) return json({ ok: false, error: 'lead_id_invalido' }, 400);

    const { data, error } = await supabase
      .from('leads')
      .update({ email_bienvenida_enviado_at: new Date().toISOString() })
      .eq('id', leadId)
      .is('email_bienvenida_enviado_at', null)
      .select('id, email');
    if (error) return json({ ok: false, error: 'db_error', message: error.message }, 500);

    try {
      await supabase.from('webhook_logs').insert({
        webhook_url: 'email-bienvenida (make)',
        status: 'success',
        error_message: data?.length ? null : 'ya_marcado',
        payload: { lead_id: leadId, email: data?.[0]?.email ?? null },
      });
    } catch { /* no bloquear */ }

    return json({ ok: true, updated: (data?.length || 0) > 0 });
  }

  return json({ ok: false, error: 'action_invalida' }, 400);
});
