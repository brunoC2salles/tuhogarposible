// spoki-stage-update — mueve un lead a "buscando_vivienda" cuando Spoki avisa (vía Make)
// que le envió el WhatsApp con las recomendaciones de vivienda.
// Entrada (POST JSON): { secret, phone, origen? }
// Regla (decisión Bruno 13/10/2026): solo pasa de nuevo_lead a buscando_vivienda;
// si el lead ya está en otra etapa, no se toca.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ETAPA_ORIGEN = 'nuevo_lead';
const ETAPA_DESTINO = 'buscando_vivienda';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ultimos9 = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-9);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'json_invalido' }, 400); }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Secreto guardado en admin_settings (key: spoki_stage_secret)
  const { data: s } = await supabase.from('admin_settings').select('value').eq('key', 'spoki_stage_secret').maybeSingle();
  const secret = String(s?.value || '').trim();
  if (!secret || body?.secret !== secret) return json({ ok: false, error: 'unauthorized' }, 401);

  const phone = ultimos9(body?.phone);
  const origen = String(body?.origen || 'spoki').slice(0, 60);

  const log = async (status: string, msg: string | null, payload: Record<string, unknown>) => {
    try {
      await supabase.from('webhook_logs').insert({
        webhook_url: `spoki-stage-update (${origen})`, status, error_message: msg, payload,
      });
    } catch { /* no bloquear */ }
  };

  // Teléfono inválido (p. ej. "Probar conexión" de Spoki): se registra y se responde sin error
  // para no desactivar el escenario de Make.
  if (phone.length !== 9) {
    await log('error', 'telefono_invalido', { phone_recibido: String(body?.phone ?? '').slice(0, 40) });
    return json({ ok: true, updated: false, reason: 'telefono_invalido' });
  }

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, telefono, stage, notas, agente_asignado_id, created_at')
    .like('telefono', `%${phone}`)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    await log('error', error.message, { phone });
    return json({ ok: false, error: 'db_error' }, 500);
  }

  const lead = (leads || []).find((l: any) => ultimos9(l.telefono) === phone);
  if (!lead) {
    await log('success', 'lead_no_encontrado', { phone });
    return json({ ok: true, updated: false, reason: 'lead_no_encontrado' });
  }
  if (lead.stage !== ETAPA_ORIGEN) {
    await log('success', `sin_cambio_etapa_actual_${lead.stage}`, { phone, lead_id: lead.id });
    return json({ ok: true, updated: false, reason: 'etapa_actual', stage: lead.stage, lead_id: lead.id });
  }

  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const nota = `[${stamp} | ${origen}] Recibió el WhatsApp con viviendas recomendadas: movido a Buscando vivienda.`;
  const { error: upErr } = await supabase
    .from('leads')
    .update({ stage: ETAPA_DESTINO, notas: [lead.notas, nota].filter(Boolean).join('\n') })
    .eq('id', lead.id)
    .eq('stage', ETAPA_ORIGEN);
  if (upErr) {
    await log('error', upErr.message, { phone, lead_id: lead.id });
    return json({ ok: false, error: 'update_error' }, 500);
  }

  // Historial: lead_historico exige changed_by; se usa el agente asignado si existe.
  if (lead.agente_asignado_id) {
    await supabase.from('lead_historico').insert({
      lead_id: lead.id, stage_anterior: ETAPA_ORIGEN, stage_nuevo: ETAPA_DESTINO,
      changed_by: lead.agente_asignado_id, notas: `Automático (${origen})`,
    });
  }

  await log('success', null, { phone, lead_id: lead.id, de: ETAPA_ORIGEN, a: ETAPA_DESTINO });
  return json({ ok: true, updated: true, lead_id: lead.id, stage: ETAPA_DESTINO });
});
