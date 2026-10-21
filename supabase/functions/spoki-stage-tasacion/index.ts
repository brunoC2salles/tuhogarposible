// spoki-stage-tasacion — mueve un lead con vivienda a "vivienda_encontrada" cuando Spoki avisa (vía Make)
// desde la automatización "Leads con vivienda" (WhatsApp de Albert).
// Entrada (POST JSON): { secret, phone, origen? }
// Regla (decisión Bruno 14/10/2026): solo pasa desde nuevo_lead, llamada o buscando_vivienda;
// cualquier otra etapa no se toca (nunca retroceder un lead).
// 20/10/2026: el destino pasa de tasacion_prevision a vivienda_encontrada (nuevo kanban).
// El nombre de la función se mantiene porque el escenario Make "Spoki - Con vivienda a Tasación" la llama.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ETAPAS_ORIGEN = ['nuevo_lead', 'llamada', 'buscando_vivienda'];
const ETAPA_DESTINO = 'vivienda_encontrada';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ultimos9 = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-9);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'json_invalido' }, 400); }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Mismo secreto que spoki-stage-update (admin_settings, key: spoki_stage_secret)
  const { data: s } = await supabase.from('admin_settings').select('value').eq('key', 'spoki_stage_secret').maybeSingle();
  const secret = String(s?.value || '').trim();
  if (!secret || body?.secret !== secret) return json({ ok: false, error: 'unauthorized' }, 401);

  const phone = ultimos9(body?.phone);
  const origen = String(body?.origen || 'spoki').slice(0, 60);

  const log = async (status: string, msg: string | null, payload: Record<string, unknown>) => {
    try {
      await supabase.from('webhook_logs').insert({
        webhook_url: `spoki-stage-tasacion (${origen})`, status, error_message: msg, payload,
      });
    } catch { /* no bloquear */ }
  };

  // Teléfono inválido (p. ej. "Probar conexión" de Spoki): se registra y se responde sin error.
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
  if (!ETAPAS_ORIGEN.includes(lead.stage)) {
    await log('success', `sin_cambio_etapa_actual_${lead.stage}`, { phone, lead_id: lead.id });
    return json({ ok: true, updated: false, reason: 'etapa_actual', stage: lead.stage, lead_id: lead.id });
  }

  const etapaAnterior = lead.stage;
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const nota = `[${stamp} | ${origen}] Lead con vivienda contactado por WhatsApp (Albert): movido a Vivienda encontrada.`;
  const { data: upd, error: upErr } = await supabase
    .from('leads')
    .update({ stage: ETAPA_DESTINO, notas: [lead.notas, nota].filter(Boolean).join('\n') })
    .eq('id', lead.id)
    .eq('stage', etapaAnterior)
    .select('id');
  if (upErr) {
    await log('error', upErr.message, { phone, lead_id: lead.id });
    return json({ ok: false, error: 'update_error' }, 500);
  }
  if (!upd || upd.length === 0) {
    await log('success', 'sin_cambio_etapa_cambiada_en_paralelo', { phone, lead_id: lead.id });
    return json({ ok: true, updated: false, reason: 'etapa_cambiada', lead_id: lead.id });
  }

  // Historial: lead_historico exige changed_by; se usa el agente asignado si existe.
  if (lead.agente_asignado_id) {
    await supabase.from('lead_historico').insert({
      lead_id: lead.id, stage_anterior: etapaAnterior, stage_nuevo: ETAPA_DESTINO,
      changed_by: lead.agente_asignado_id, notas: `Automático (${origen})`,
    });
  }

  await log('success', null, { phone, lead_id: lead.id, de: etapaAnterior, a: ETAPA_DESTINO });
  return json({ ok: true, updated: true, lead_id: lead.id, stage: ETAPA_DESTINO });
});
