import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HOUSAGE_AGENT_ID = 'fa5038e7-0e88-49c7-88ae-ac506e12340b';

// Normaliza chave de label do Tally para matching
const norm = (s: string) =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

// Mapeia labels conhecidos -> campos internos
const LABEL_MAP: Record<string, string> = {
  nombre: 'nombre_completo',
  nombre_completo: 'nombre_completo',
  name: 'nombre_completo',
  full_name: 'nombre_completo',
  nome: 'nombre_completo',
  nome_completo: 'nombre_completo',
  email: 'email',
  correo: 'email',
  correo_electronico: 'email',
  e_mail: 'email',
  telefono: 'telefono',
  telefone: 'telefono',
  phone: 'telefono',
  movil: 'telefono',
  whatsapp: 'telefono',
  ciudad: 'ciudad_interes',
  ciudad_interes: 'ciudad_interes',
  city: 'ciudad_interes',
  zona: 'zona_interes',
  zona_interes: 'zona_interes',
  valor: 'valor_inmueble_deseado',
  presupuesto: 'valor_inmueble_deseado',
  precio: 'valor_inmueble_deseado',
  valor_inmueble: 'valor_inmueble_deseado',
  valor_inmueble_deseado: 'valor_inmueble_deseado',
  notas: 'notas',
  comentarios: 'notas',
  mensaje: 'notas',
  message: 'notas',
};

interface ParsedLead {
  nombre_completo?: string;
  email?: string;
  telefono?: string;
  ciudad_interes?: string;
  zona_interes?: string;
  valor_inmueble_deseado?: number;
  notas?: string;
  extras: Record<string, unknown>;
}

function parsePayload(body: any): ParsedLead {
  const out: ParsedLead = { extras: {} };

  const set = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    if (key === 'valor_inmueble_deseado') {
      const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
      if (!isNaN(n) && n > 0) (out as any)[key] = n;
      return;
    }
    (out as any)[key] = String(value).trim();
  };

  // 1) Campos diretos no body
  for (const [k, v] of Object.entries(body || {})) {
    const mapped = LABEL_MAP[norm(k)];
    if (mapped) set(mapped, v);
    else if (typeof v !== 'object') out.extras[k] = v;
  }

  // 2) Formato cru do Tally: { fields: [{ label, value }] } ou { data: { fields: [...] } }
  const fields =
    (Array.isArray(body?.fields) && body.fields) ||
    (Array.isArray(body?.data?.fields) && body.data.fields) ||
    [];

  for (const f of fields) {
    const label = f?.label || f?.key || f?.name;
    let value = f?.value ?? f?.answer;
    if (Array.isArray(value)) value = value.map((x: any) => x?.text ?? x?.label ?? x).join(', ');
    if (!label) continue;
    const mapped = LABEL_MAP[norm(String(label))];
    if (mapped) set(mapped, value);
    else if (value !== undefined && value !== null && value !== '') out.extras[String(label)] = value;
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

    console.log('[tally-housage-webhook] payload recebido:', raw.slice(0, 2000));

    const lead = parsePayload(body);

    if (!lead.nombre_completo || (!lead.email && !lead.telefono)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Campos obrigatórios ausentes: nombre_completo + (email ou telefono)',
          parsed: lead,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Monta notas com prefixo + extras
    const extrasText = Object.keys(lead.extras).length
      ? '\n\nCampos adicionales:\n' +
        Object.entries(lead.extras)
          .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('\n')
      : '';
    const notas = `[Tally Housage]${lead.notas ? ' ' + lead.notas : ''}${extrasText}`.trim();

    const insertPayload = {
      nombre_completo: lead.nombre_completo,
      email: lead.email || '',
      telefono: lead.telefono || '',
      ciudad_interes: lead.ciudad_interes || null,
      zona_interes: lead.zona_interes || null,
      valor_inmueble_deseado: lead.valor_inmueble_deseado || null,
      notas,
      agente_asignado_id: HOUSAGE_AGENT_ID,
      source: 'manual' as const,
      stage: 'nuevo_lead' as const,
    };

    const { data, error } = await supabase
      .from('leads')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      console.error('[tally-housage-webhook] erro ao inserir lead:', error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[tally-housage-webhook] lead criado:', data.id, '→ Housage');

    return new Response(
      JSON.stringify({ ok: true, lead_id: data.id, agente: 'Housage' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[tally-housage-webhook] erro inesperado:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String((err as Error)?.message || err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
