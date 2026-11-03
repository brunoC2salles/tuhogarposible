// lead-inmolender-planilla (02/11/2026, actualizado 03/11/2026)
// Envía cada lead cualificado UNA sola vez a Inmolender a través de una planilla:
//   - con vivienda -> "cualificados a inmolender" (Make: "CRM cualificados a planilla Inmolender")
//                     Inmolender crea la operación (finanzas_tuhogarposible).
//   - sin vivienda -> "sin vivienda" (Make: "CRM sin vivienda a planilla Inmolender")
//                     Inmolender crea la tarjeta en el tablero "Hipotecados" (Alanis).   [03/11/2026]
// Lo llama el trigger trg_lead_inmolender_planilla (alta o cambio de etapa).
// Anti-duplicado: public.inmolender_envios (PK lead_id). Si el lead ya está, no se envía.
// Entrada (POST JSON): { secret, lead_id, dry_run?, backfill? }  · secret = admin_settings.inmolender_trigger_secret
// backfill=true (03/11/2026): reenvía un lead SIN vivienda a la planilla "sin vivienda" aunque ya esté en
//   inmolender_envios (carga de los últimos días). Nunca envía con vivienda por esta vía.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Etapas que NO van a Inmolender
const EXCLUIDAS = ['descualificados', 'no_cualificado', 'llamada_consultoria'];

// Etapa CRM -> estado Inmolender (acordado 02/11/2026). Sin acuerdo aún: firma_contrato, informacion_riesgos.
const ESTADO: Record<string, string> = {
  buscando_vivienda: 'ESTUDIO',
  vivienda_encontrada: 'DOC REQUERIDA',
  documentacion_ok: 'EXPEDIENTE',
  tasacion_prevision: 'TASACION',
  fein: 'ESPERA FEIN',
};

// Código INE de provincia -> nombre exacto del catálogo de Inmolender
const PROVINCIAS: Record<string, string> = {
  '01': 'Araba /Álava', '02': 'Albacete', '03': 'Alicante /Alacant', '04': 'Almería', '05': 'Ávila',
  '06': 'Badajoz', '07': 'Balears, Illes', '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres',
  '11': 'Cádiz', '12': 'Castellón/Castelló', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'Coruña, A',
  '16': 'Cuenca', '17': 'Girona / Gerona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa / Guipúzcoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida / Lérida', '26': 'La Rioja',
  '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia', '31': 'Navarra', '32': 'Ourense / Orense',
  '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas', '36': 'Pontevedra', '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia', '41': 'Sevilla', '42': 'Soria',
  '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo', '46': 'Valencia/València', '47': 'Valladolid',
  '48': 'Bizkaia / Vizcaya', '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

const SI = /^\s*(s[ií]|s|yes|1|true)\s*$|^\s*s[ií]\s/i;

function telefono(raw: unknown): string {
  let d = String(raw ?? '').replace(/[^0-9]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9) d = '34' + d;
  return d;
}

function edadDeNotas(notas: string | null): string {
  if (!notas) return '';
  const m = notas.match(/Edad:\s*(.+?)(?:\n|$)/i);
  return m ? m[1].trim() : '';
}

function num(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : '';
}

function construirFila(lead: any) {
  const s = lead.simulador_hipotecario_data || {};
  const stage = String(lead.stage || '');
  let conVivienda: boolean;
  if (stage === 'buscando_vivienda') conVivienda = false;
  else if (stage === 'nuevo_lead') conVivienda = SI.test(String(s.meta_vivienda_seleccionada ?? ''));
  else conVivienda = true;

  const max = num(s.precio_maximo_inmueble ?? s.valor_maximo_inmueble ?? s.monto_maximo_financiable);
  const cod = s.zona_cod_muni ? String(s.zona_cod_muni).padStart(5, '0').slice(0, 2) : '';
  const estado = stage === 'nuevo_lead' ? (conVivienda ? 'DOC REQUERIDA' : 'ESTUDIO') : (ESTADO[stage] || '');
  const idealista = String(s.idealista_url || '');
  const ahorros = Number(s.meta_monto_ahorros) > 0 ? String(s.meta_monto_ahorros) : String(s.meta_tiene_ahorros ?? '');

  return {
    nombre: String(lead.nombre_completo || '').trim(),
    telefono: telefono(lead.telefono),
    correo: lead.email || '',
    zona: String(lead.ciudad_interes || lead.zona_interes || '').trim(),
    provincia: PROVINCIAS[cod] || '',
    vivienda: conVivienda ? 'sí' : 'no',
    precio_vivienda: conVivienda ? num(lead.precio_vivienda) : max,
    max_a_financiar: max,
    plazo: s.plazo_anos ? String(s.plazo_anos) : '',
    tin: s.tae_estimada ? String(s.tae_estimada) : '2.5',
    edad: edadDeNotas(lead.notas),
    ahorros,
    ingresos_mensuales: num(s.ingresos),
    estado_inmolender: estado,
    link_recomendaciones: conVivienda ? '' :
      'https://www.tuhogarposible.com/viviendas' + (idealista ? '?i=' + encodeURIComponent(idealista) : ''),
    lead_id: lead.id,
  };
}

async function enviar(url: string, fila: unknown) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fila), signal: AbortSignal.timeout(20000),
  });
  return { ok: r.ok, status: r.status, txt: (await r.text()).slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const body = await req.json().catch(() => ({}));
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: cfgRows } = await supabase.from('admin_settings').select('key, value')
    .in('key', ['inmolender_trigger_secret', 'webhook_inmolender_planilla_url', 'webhook_inmolender_sin_vivienda_url']);
  const cfg = Object.fromEntries((cfgRows || []).map((r: any) => [r.key, String(r.value || '').trim()]));
  if (!cfg.inmolender_trigger_secret || body?.secret !== cfg.inmolender_trigger_secret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', body?.lead_id).maybeSingle();
  if (error || !lead) return json({ ok: false, error: 'lead_no_encontrado' }, 404);

  const fila = construirFila(lead);
  const conVivienda = fila.vivienda === 'sí';
  const url = conVivienda ? cfg.webhook_inmolender_planilla_url : cfg.webhook_inmolender_sin_vivienda_url;
  if (body?.dry_run) return json({ ok: true, dry_run: true, destino: conVivienda ? 'con_vivienda' : 'sin_vivienda', fila });

  if (EXCLUIDAS.includes(String(lead.stage)) || lead.archivado_at) {
    return json({ ok: true, skipped: 'etapa_excluida_o_archivado' });
  }
  if (!url) return json({ ok: false, error: 'sin_webhook' }, 500);

  // Carga manual de sin vivienda (no toca inmolender_envios)
  if (body?.backfill) {
    if (conVivienda) return json({ ok: true, skipped: 'backfill_solo_sin_vivienda' });
    try {
      const r = await enviar(url, fila);
      await supabase.from('webhook_logs').insert({
        webhook_url: 'lead-inmolender-planilla-backfill', status: r.ok ? 'success' : 'error',
        error_message: r.ok ? null : `${r.status} ${r.txt}`, payload: { lead_id: lead.id, etapa: lead.stage },
      });
      return json({ ok: r.ok, status: r.status, backfill: true });
    } catch (e) {
      return json({ ok: false, error: String(e) }, 500);
    }
  }

  // Reserva atómica: si ya existe la fila, otro proceso ya lo envió (o está excluido).
  const { data: reserva, error: errRes } = await supabase.from('inmolender_envios')
    .insert({ lead_id: lead.id, status: 'pendiente', etapa: lead.stage }).select('lead_id');
  if (errRes || !reserva?.length) return json({ ok: true, skipped: 'ya_enviado' });

  try {
    const r = await enviar(url, fila);
    await supabase.from('inmolender_envios').update({
      status: r.ok ? 'enviado' : 'error', error: r.ok ? null : `${r.status} ${r.txt}`, updated_at: new Date().toISOString(),
    }).eq('lead_id', lead.id);
    await supabase.from('webhook_logs').insert({
      webhook_url: conVivienda ? 'lead-inmolender-planilla' : 'lead-inmolender-planilla-sin-vivienda',
      status: r.ok ? 'success' : 'error',
      error_message: r.ok ? null : `${r.status} ${r.txt}`, payload: { lead_id: lead.id, etapa: lead.stage },
    });
    return json({ ok: r.ok, status: r.status, destino: conVivienda ? 'con_vivienda' : 'sin_vivienda' });
  } catch (e) {
    await supabase.from('inmolender_envios').update({ status: 'error', error: String(e), updated_at: new Date().toISOString() }).eq('lead_id', lead.id);
    return json({ ok: false, error: String(e) }, 500);
  }
});
