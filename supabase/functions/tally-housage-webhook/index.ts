// ============================================================================
// TALLY → HOUSAGE WEBHOOK
// Adaptador: recebe payload do Tally (via Make), normaliza para o shape do
// meta-lead-webhook e encaminha forçando o agente Housage.
// Assim, o lead passa pelo MESMO pipeline (qualificação + simuladores +
// Bitrix payload + webhook Make) que os leads do Meta Ads.
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HOUSAGE_AGENT_ID = 'fa5038e7-0e88-49c7-88ae-ac506e12340b';

// Normaliza chave/label para matching tolerante (lowercase + sem acentos + sem pontuação)
const norm = (s: string) =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

// Mapa de labels Tally → campos esperados pelo meta-lead-webhook
// Inclui pedaços-chave da label para matching parcial robusto.
const LABEL_PATTERNS: Array<{ match: RegExp; field: string }> = [
  // Identificação
  { match: /^(nombre|nome|name|full_name|nombre_completo)$/, field: 'nombre' },
  { match: /^(correo|email|e_mail|correo_electronico|mail)$/, field: 'email' },
  { match: /^(telefono|telefone|phone|movil|whatsapp|tel)$/, field: 'telefono' },
  { match: /^(edad|age|anos|años)$/, field: 'edad' },

  // Qualificação
  { match: /tiempo.*trabajo|antiguedad|trabajo_actual|cuanto_tiempo/, field: 'antiguedad_trabajo' },
  { match: /(nie|dni|documento|identifica)/, field: 'tiene_nie_dni' },
  { match: /(morosidad|fichero|asnef|rai)/, field: 'en_fichero_morosidad' },
  { match: /(prefieres.*llam|preferencia.*llam|cuando.*llam|horario.*llam)/, field: 'preferencia_llamada' },

  // Imóvel desejado
  { match: /(zona|donde.*vivir|ciudad_interes|donde_quieres)/, field: 'zona_interes' },
  { match: /(rango.*ingresos|ingresos.*mensual|ingresos_neto|ingresos_hogar|ingresos)/, field: 'rango_ingresos' },
  { match: /(deuda|credito.*pagas|pagas_mensual|cuota.*deuda|cuanto_pagas)/, field: 'deudas_mensuales' },
  { match: /(habitacion|cuartos|dormitorios|numero.*habitacion)/, field: 'habitaciones' },

  // Ahorros / vivienda
  { match: /(ahorros.*impuesto|cuentas.*ahorros|tienes.*ahorros|dispones.*ahorros)/, field: 'tiene_ahorros_impuestos' },
  { match: /(monto.*ahorros|cuanto.*ahorros|cuanto$)/, field: 'monto_ahorros' },
  { match: /(vivienda.*selecciona|tienes.*vivienda|cuentas.*vivienda)/, field: 'tiene_vivienda_seleccionada' },
];

function mapLabel(label: string): string | null {
  const n = norm(label);
  if (!n) return null;
  for (const { match, field } of LABEL_PATTERNS) {
    if (match.test(n)) return field;
  }
  return null;
}

// Extrai valor "human-readable" de um field do Tally (suporta options/choices)
function extractTallyValue(f: any): unknown {
  let v = f?.value ?? f?.answer ?? f?.text;

  // Tally costuma enviar IDs em "value" e os labels em "options"
  if (Array.isArray(f?.options) && Array.isArray(v)) {
    const labels = v
      .map((id: any) => f.options.find((o: any) => o.id === id)?.text ?? id)
      .filter(Boolean);
    return labels.join(', ');
  }
  if (Array.isArray(f?.options) && (typeof v === 'string' || typeof v === 'number')) {
    const opt = f.options.find((o: any) => o.id === v);
    if (opt?.text) return opt.text;
  }
  if (Array.isArray(v)) {
    return v.map((x: any) => x?.text ?? x?.label ?? x).join(', ');
  }
  return v;
}

interface MetaLeadShape {
  nombre?: string;
  email?: string;
  telefono?: string;
  edad?: number | string;
  antiguedad_trabajo?: string;
  tiene_nie_dni?: string;
  en_fichero_morosidad?: string;
  preferencia_llamada?: string;
  zona_interes?: string;
  rango_ingresos?: string;
  deudas_mensuales?: number | string;
  habitaciones?: number | string;
  tiene_ahorros_impuestos?: string;
  monto_ahorros?: string | number;
  tiene_vivienda_seleccionada?: string;
  // Marcadores
  force_agent_id: string;
  source_origin: string;
  [k: string]: unknown;
}

function buildMetaShape(body: any): MetaLeadShape {
  const out: MetaLeadShape = {
    force_agent_id: HOUSAGE_AGENT_ID,
    source_origin: 'tally_housage',
  };

  const setField = (field: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    (out as any)[field] = value;
  };

  // 1) Campos diretos no body (caso o Make já tenha "achatado")
  for (const [k, v] of Object.entries(body || {})) {
    if (k === 'fields' || k === 'data') continue;
    const field = mapLabel(k);
    if (field) setField(field, typeof v === 'object' ? JSON.stringify(v) : v);
  }

  // 2) Formato cru do Tally: { fields:[{label,value,options?}] } ou { data:{fields:[...]} }
  const fields =
    (Array.isArray(body?.fields) && body.fields) ||
    (Array.isArray(body?.data?.fields) && body.data.fields) ||
    [];

  for (const f of fields) {
    const label = f?.label || f?.key || f?.name || f?.title;
    if (!label) continue;
    const field = mapLabel(String(label));
    if (!field) continue;
    const value = extractTallyValue(f);
    if (value !== undefined && value !== null && value !== '') {
      setField(field, value);
    }
  }

  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    console.log('[tally-housage-webhook] payload recebido (raw, primeiros 2000 chars):', raw.slice(0, 2000));

    const metaShape = buildMetaShape(body);
    console.log('[tally-housage-webhook] payload normalizado para meta-lead-webhook:', JSON.stringify(metaShape));

    // Validação mínima — meta-lead-webhook exige nombre + telefono + email
    const missing: string[] = [];
    if (!metaShape.nombre) missing.push('nombre');
    if (!metaShape.telefono) missing.push('telefono');
    if (!metaShape.email) missing.push('email');
    if (missing.length) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Campos obrigatórios ausentes: ${missing.join(', ')}`,
          parsed: metaShape,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Encaminhar para meta-lead-webhook (mesmo pipeline do Meta Ads)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const targetUrl = `${supabaseUrl}/functions/v1/meta-lead-webhook`;

    const fwd = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(metaShape),
    });

    const fwdText = await fwd.text();
    let fwdJson: any = null;
    try { fwdJson = JSON.parse(fwdText); } catch { fwdJson = { raw: fwdText }; }

    console.log('[tally-housage-webhook] meta-lead-webhook respondeu', fwd.status, fwdText.slice(0, 1000));

    return new Response(
      JSON.stringify({
        ok: fwd.ok,
        forwarded_to: 'meta-lead-webhook',
        agente_forzado: 'Housage',
        meta_response: fwdJson,
      }),
      { status: fwd.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[tally-housage-webhook] erro inesperado:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
