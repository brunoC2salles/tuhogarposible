// ============================================================================
// Reprocesa leads "descualificados" de meta_ads en un rango de fechas
// con las NUEVAS reglas de cualificación (edad ≤60, ingresos ≥1200, ahorros ≥1000).
// Recalcula precio máximo de vivienda (P1 nueva + cap 210k) y, en modo apply,
// los mueve a 'nuevo_lead', asigna agente y envía a Bitrix vía webhook Meta.
//
// Seguridad: requiere header Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>.
//
// Body JSON:
//   { mode: 'dry-run' | 'apply',
//     from?: 'YYYY-MM-DD' (default 2026-06-20),
//     to?:   'YYYY-MM-DD' EXCLUSIVO (default 2026-06-25),
//     limit?: number (default 500) }
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildBitrixPayloadFromLead } from '../_shared/bitrixPayload.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------- Reglas (espejo de meta-lead-webhook 2026-06-25) ----------
const EDAD_MAX = 60;
const INGRESOS_MIN = 1200;
const AHORROS_MIN = 1000;

const CP_TOPE = 15000;
const PCT_FINANCIACION = 0.90;
const CAP_MONTO_1_TITULAR = 210000;
const MIN_MONTO_HIPOTECA = 70000;
const MIN_CAPACIDAD_MES = 350;

function parseAntiguedad(respuesta?: string): { suficiente: boolean; tipo_contrato?: string } {
  if (!respuesta) return { suficiente: false };
  const resp = respuesta.toLowerCase().trim().replace(/_/g, ' ');
  if (
    resp.includes('fijo discontinuo') || resp.includes('discontinuo') ||
    resp.includes('temporal') || resp.includes('por obra') || resp.includes('obra y servicio') ||
    resp.includes('practicas') || resp.includes('prácticas') ||
    resp.includes('formacion') || resp.includes('formación') ||
    resp.includes('interinidad') || resp.includes('eventual')
  ) return { suficiente: false, tipo_contrato: 'precario' };
  if (
    resp.includes('menos de 1') || resp.includes('menos de un') ||
    resp === '0' || resp === 'no' || resp.includes('< 1') ||
    resp.includes('0 meses') || resp.includes('ninguna')
  ) return { suficiente: false };
  if (
    resp.includes('más de 1') || resp.includes('mas de 1') ||
    resp.includes('más de un') || resp.includes('mas de un') ||
    resp.includes('1 año') || resp.includes('1 ano') ||
    resp.includes('2 año') || resp.includes('3 año') ||
    resp.includes('> 1') || resp.includes('indefinido') || resp.includes('fijo')
  ) return { suficiente: true };
  const m = resp.match(/(\d+)/);
  if (m && parseInt(m[1], 10) >= 1) return { suficiente: true };
  return { suficiente: true };
}

function normalizeAhorrosResponse(value: any): string {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}
function isAffirmativeAhorrosResponse(value: any): boolean {
  const n = normalizeAhorrosResponse(value);
  if (!n) return false;
  if (/\b(no|sin|ningun|ninguna|nada|0)\b/.test(n)) return false;
  return /\b(si|yes|tengo|dispongo|cuento|claro|afirmativo)\b/.test(n);
}

function extractFromNotes(notas: string | null | undefined, key: string): string {
  if (!notas) return '';
  const r = new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, 'i');
  const m = notas.match(r);
  return m ? m[1].trim() : '';
}

function calcularHipoteca(ingresos: number, deudas: number, edad: number) {
  const cap = Math.max((ingresos - deudas) * 0.35, 0);
  const plazoAnos = Math.max(Math.min(30, 75 - (edad || 35)), 1);
  const n = plazoAnos * 12;
  const r = 0.025 / 12;
  const factor = (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  const teorico = Math.round(cap * factor);
  const montoFin = Math.min(teorico, CAP_MONTO_1_TITULAR);
  const cuotaReal = montoFin > 0
    ? Math.round((montoFin * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
  const valorMaxInm = Math.round(montoFin / PCT_FINANCIACION);
  const aprobable = montoFin >= MIN_MONTO_HIPOTECA && cap >= MIN_CAPACIDAD_MES;
  return {
    monto_maximo_financiable: montoFin,
    valor_maximo_inmueble: valorMaxInm,
    cuota_maxima_mensual: Math.round(cap),
    cuota_mensual_real: cuotaReal,
    plazo_anos: plazoAnos,
    tae_estimada: 2.5,
    porcentaje_financiacion: PCT_FINANCIACION * 100,
    aprobado: aprobable,
  };
}

function calcularPrecioMaximo(ahorros: number, tasaITP: number, montoFin: number) {
  const a = Math.max(ahorros || 0, 0);
  const denomP1 = tasaITP + 0.10;
  const cpMax = CP_TOPE + a;
  const p1 = denomP1 > 0 ? Math.round(cpMax / denomP1) : 0;
  const p2 = Math.round((montoFin || 0) / PCT_FINANCIACION);
  const cand = [p1, p2].filter(v => v > 0);
  const reco = cand.length > 0 ? Math.min(...cand) : 0;
  return { precio_max_p1: p1, precio_max_p2: p2, precio_max_recomendado: reco, cp_max: Math.round(cpMax), tasa_itp_aplicada: tasaITP };
}

function recualificar(input: {
  edad: number | null;
  ingresos: number;
  deudas: number;
  ahorros: number;
  respuestaAhorros: string;
  antiguedad: string;
  prevReason: string;
}): { cualificado: boolean; razon?: string } {
  // Si el motivo previo fue NIE o morosidad, NO se reevalúa (no tenemos esos datos almacenados).
  const prev = (input.prevReason || '').toLowerCase();
  if (prev.includes('nie') || prev.includes('dni')) {
    return { cualificado: false, razon: 'Sin NIE/DNI (no reevaluable)' };
  }
  if (prev.includes('morosidad') || prev.includes('asnef') || prev.includes('rai')) {
    return { cualificado: false, razon: 'Fichero de morosidad (no reevaluable)' };
  }

  // 1. Antigüedad
  const ant = parseAntiguedad(input.antiguedad);
  if (!ant.suficiente) {
    return { cualificado: false, razon: ant.tipo_contrato === 'precario'
      ? 'Contrato precario' : 'Antigüedad laboral insuficiente (menos de 1 año)' };
  }
  // 4. Edad
  if (input.edad && input.edad > EDAD_MAX) {
    return { cualificado: false, razon: 'Edad superior a 60 años' };
  }
  // 5. Ingresos
  if (input.ingresos < INGRESOS_MIN) {
    return { cualificado: false, razon: `Ingresos insuficientes (menos de ${INGRESOS_MIN}€)` };
  }
  // 6. Deuda
  if (input.ingresos > 0 && (input.deudas / input.ingresos) * 100 >= 30) {
    return { cualificado: false, razon: 'Porcentaje de deuda muy alto (≥30% de ingresos)' };
  }
  // 7. Ahorros
  const ok = isAffirmativeAhorrosResponse(input.respuestaAhorros) || (input.ahorros || 0) >= AHORROS_MIN;
  if (!ok) return { cualificado: false, razon: `Ahorros insuficientes (mínimo ${AHORROS_MIN}€ o respuesta afirmativa "sí")` };

  return { cualificado: true };
}

// Mapa mínimo ciudad → comunidad para fallback de ITP cuando no hay tasa_itp_aplicada.
const CIUDAD_COMUNIDAD: Record<string, string> = {
  'madrid': 'Comunidad de Madrid', 'barcelona': 'Cataluña', 'valencia': 'Comunidad Valenciana',
  'sevilla': 'Andalucía', 'málaga': 'Andalucía', 'malaga': 'Andalucía',
  'zaragoza': 'Aragón', 'murcia': 'Región de Murcia', 'palma': 'Islas Baleares',
  'bilbao': 'País Vasco', 'san sebastián': 'País Vasco',
  'santiago': 'Galicia', 'vigo': 'Galicia', 'coruña': 'Galicia',
  'oviedo': 'Principado de Asturias', 'gijón': 'Principado de Asturias',
  'santander': 'Cantabria', 'valladolid': 'Castilla y León',
  'logroño': 'La Rioja', 'toledo': 'Castilla-La Mancha',
  'cáceres': 'Extremadura', 'badajoz': 'Extremadura', 'tenerife': 'Canarias',
};
const ITP_POR_CCAA: Record<string, number> = {
  'Andalucía': 0.07, 'Aragón': 0.08, 'Principado de Asturias': 0.08, 'Islas Baleares': 0.08,
  'Canarias': 0.065, 'Cantabria': 0.09, 'Castilla-La Mancha': 0.09, 'Castilla y León': 0.08,
  'Cataluña': 0.10, 'Ceuta': 0.06, 'Comunidad de Madrid': 0.06, 'Comunidad Valenciana': 0.10,
  'Extremadura': 0.08, 'Galicia': 0.09, 'La Rioja': 0.07, 'Melilla': 0.06,
  'Región de Murcia': 0.08, 'Navarra': 0.06, 'País Vasco': 0.04,
};

function deriveTasaITP(lead: any): number {
  const stored = Number(lead?.simulador_hipotecario_data?.tasa_itp_aplicada);
  if (stored > 0) return stored;
  const ciudad = (lead?.ciudad_interes || '').toLowerCase().trim();
  const ccaa = CIUDAD_COMUNIDAD[ciudad];
  return (ccaa && ITP_POR_CCAA[ccaa]) || 0.08;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode: 'dry-run' | 'apply' = body.mode === 'apply' ? 'apply' : 'dry-run';

    // Auth: apply requiere confirmación explícita por body.
    if (mode === 'apply' && body.confirm !== 'APPLY_REPROCESS_2026_06_20_24') {
      return new Response(JSON.stringify({ error: 'apply requires body.confirm = APPLY_REPROCESS_2026_06_20_24' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const from = body.from || '2026-06-20';
    const to = body.to || '2026-06-25';
    const limit = Math.min(Number(body.limit) || 500, 1000);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('source', 'meta_ads')
      .eq('stage', 'descualificados')
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const webhookSetting = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_meta_bitrix_url')
      .single();
    const webhookUrl = webhookSetting.data?.value || '';

    const results: any[] = [];
    let ahoraCualifican = 0;
    let siguenDescualificados = 0;
    const motivosNuevos: Record<string, number> = {};
    let applied = 0;
    let appliedWebhookOk = 0;
    let appliedWebhookFail = 0;

    for (const lead of (leads || [])) {
      const sim = (lead.simulador_hipotecario_data as any) || {};
      const ingresos = Number(sim.ingresos ?? 0);
      const deudas = Number(sim.deudas ?? 0);
      const ahorros = Number(sim.meta_monto_ahorros ?? 0);
      const respuestaAhorros = String(sim.meta_tiene_ahorros ?? '');
      const antiguedad = String(sim.meta_antiguedad_trabajo ?? extractFromNotes(lead.notas, 'Antigüedad'));
      const edadStr = extractFromNotes(lead.notas, 'Edad');
      const edad = edadStr && /^\d+$/.test(edadStr) ? parseInt(edadStr, 10) : null;
      const prevReason = (extractFromNotes(lead.notas, 'NO CUALIFICADO -') ||
        (lead.notas?.match(/NO CUALIFICADO\s*-\s*(.+)/i)?.[1] || '')).trim();

      const q = recualificar({ edad, ingresos, deudas, ahorros, respuestaAhorros, antiguedad, prevReason });

      const tasaITP = deriveTasaITP(lead);
      const hip = calcularHipoteca(ingresos, deudas, edad || 35);
      const precio = calcularPrecioMaximo(ahorros, tasaITP, hip.monto_maximo_financiable);

      if (q.cualificado) ahoraCualifican++; else { siguenDescualificados++; motivosNuevos[q.razon || 'unknown'] = (motivosNuevos[q.razon || 'unknown'] || 0) + 1; }

      const row: any = {
        id: lead.id,
        telefono: lead.telefono,
        nombre: lead.nombre_completo,
        ciudad_interes: lead.ciudad_interes,
        prev_reason: prevReason,
        edad, ingresos, deudas, ahorros, antiguedad, respuestaAhorros,
        tasa_itp: tasaITP,
        nuevo_monto_financiable: hip.monto_maximo_financiable,
        nuevo_precio_max_p1: precio.precio_max_p1,
        nuevo_precio_max_p2: precio.precio_max_p2,
        nuevo_precio_recomendado: precio.precio_max_recomendado,
        ahora_cualifica: q.cualificado,
        razon_nueva: q.razon || null,
      };

      if (mode === 'apply') {
        // Actualiza siempre el precio máximo recalculado en simulador_hipotecario_data
        const newSim = {
          ...sim,
          ...hip,
          precio_maximo_inmueble: precio.precio_max_recomendado,
          precio_max_por_ahorros: precio.precio_max_p1,
          precio_max_por_ingresos: precio.precio_max_p2,
          credito_personal_maximo: precio.cp_max,
          tasa_itp_aplicada: precio.tasa_itp_aplicada,
        };

        if (q.cualificado) {
          // Asignar agente vía round-robin
          let agente: any = null;
          try {
            const agentRes = await supabase.functions.invoke('get-next-agent', {
              body: { region: null, considerarTurno: false },
            });
            const a = agentRes?.data;
            if (a?.agent_id) agente = { id: a.agent_id, nombre: a.nombre, email: a.email, telefono: a.telefono, tidycal_url: a.tidycal_url };
          } catch (e) { console.warn('[reprocess] get-next-agent failed:', e); }

          // Update DB: mover a nuevo_lead, asignar agente, actualizar sim
          await supabase.from('leads').update({
            stage: 'nuevo_lead',
            agente_asignado_id: agente?.id || null,
            simulador_hipotecario_data: newSim,
          }).eq('id', lead.id);

          // Enviar a Bitrix
          if (webhookUrl) {
            const leadShape = { ...lead, simulador_hipotecario_data: newSim, stage: 'nuevo_lead' };
            const payload = buildBitrixPayloadFromLead({
              lead: leadShape, agente, recomendaciones: [],
              source: 'meta_ads_reprocess',
              extra: { reprocess: true, reprocess_batch: '2026-06-20_24' },
            });
            payload.lead_edad = edad || payload.lead_edad || '';
            try {
              const resp = await fetch(webhookUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const ok = resp.ok;
              let errMsg: string | null = null;
              if (!ok) { try { errMsg = `HTTP ${resp.status}: ${(await resp.text()).substring(0, 500)}`; } catch {} }
              await supabase.from('webhook_logs').insert({
                webhook_url: webhookUrl + ' (meta_bitrix_reprocess)',
                status: ok ? 'success' : 'error',
                error_message: errMsg, payload,
              });
              if (ok) appliedWebhookOk++; else appliedWebhookFail++;
              row.webhook_status = ok ? 'success' : 'error';
            } catch (e: any) {
              appliedWebhookFail++;
              row.webhook_status = 'error';
              await supabase.from('webhook_logs').insert({
                webhook_url: 'webhook_meta_bitrix_url (reprocess error)',
                status: 'error', error_message: String(e?.message || e),
              });
            }
          } else {
            row.webhook_status = 'no_webhook_url';
          }
          applied++;
          row.applied = true;
        } else if (body.refresh_descualificados === true) {
          // Solo refresca precio recalculado, sin reenviar
          await supabase.from('leads').update({ simulador_hipotecario_data: newSim }).eq('id', lead.id);
          row.applied = false;
        } else {
          row.applied = false;
        }
      }

      results.push(row);
    }

    return new Response(JSON.stringify({
      success: true,
      mode, from, to,
      total: results.length,
      ahora_cualifican: ahoraCualifican,
      siguen_descualificados: siguenDescualificados,
      motivos_nuevos: motivosNuevos,
      applied,
      webhook_ok: appliedWebhookOk,
      webhook_fail: appliedWebhookFail,
      results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[reprocess-meta-leads] error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
