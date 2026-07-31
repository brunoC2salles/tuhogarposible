// ============================================================================
// SHARED — Builder do payload do webhook SECUNDÁRIO de leads cualificados.
// Enviado em paralelo ao webhook Bitrix, com estrutura estável documentada
// na página de Configuraciones (Admin > Ajustes > Webhook Secundario).
// ============================================================================

import { isLeadQualifiedForBitrix } from './bitrixPayload.ts';

const ORGANIZATION_ID = '66d5a3b0-d797-4b8f-ad98-95b75849f799';

export interface SecondaryPayloadInput {
  lead: Record<string, any>;          // linha crua da tabela `leads`
  agente?: Record<string, any> | null; // perfil do agente atribuído
  source: string;                      // 'meta_ads' | 'tally' | 'manual' | 'test'
  documentoLink?: string | null;
  extra?: Record<string, any>;         // metadados adicionais (região, edad, etc.)
}

/** Offset de Europe/Madrid (em minutos) para um instante UTC. */
function madridOffsetMinutes(utcMs: number): number {
  const d = new Date(utcMs);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return (asUtc - utcMs) / 60000;
}

/** Converte data (YYYY-MM-DD) + hora local de Madrid em ISO UTC válido. */
function madridToIso(fecha: string, hora: string): string | null {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm, ss] = hora.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh)) return null;
  let guess = Date.UTC(y, m - 1, d, hh, mm || 0, ss || 0);
  for (let i = 0; i < 2; i++) {
    const off = madridOffsetMinutes(guess);
    guess = Date.UTC(y, m - 1, d, hh, mm || 0, ss || 0) - off * 60000;
  }
  const iso = new Date(guess);
  return isNaN(iso.getTime()) ? null : iso.toISOString();
}

function nextBusinessDayAt11(base = new Date()): string {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(base);
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  do {
    dt.setUTCDate(dt.getUTCDate() + 1);
  } while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6);
  const fecha = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  return madridToIso(fecha, '11:00:00') ?? new Date(base.getTime() + 24 * 3600 * 1000).toISOString();
}

/**
 * Resolve o instante da reunião SEMPRE como ISO UTC válido e no futuro.
 * Nunca devolve null/NaN (era a origem do famigerado 31/12/1969).
 */
function resolveScheduledAt(lead: Record<string, any>): { iso: string; fallbackUsed: boolean } {
  const now = Date.now();
  const candidates: (string | null)[] = [];

  if (lead.reunion_datetime) {
    const d = new Date(lead.reunion_datetime);
    if (!isNaN(d.getTime())) candidates.push(d.toISOString());
  }
  if (lead.fecha_reunion && lead.hora_reunion) {
    const hora = String(lead.hora_reunion).length === 5
      ? `${lead.hora_reunion}:00`
      : String(lead.hora_reunion);
    candidates.push(madridToIso(String(lead.fecha_reunion), hora));
  }
  if (lead.fecha_reunion && !lead.hora_reunion) {
    candidates.push(madridToIso(String(lead.fecha_reunion), '11:00:00'));
  }

  for (const c of candidates) {
    if (c && new Date(c).getTime() > now) return { iso: c, fallbackUsed: false };
  }
  return { iso: nextBusinessDayAt11(new Date(now)), fallbackUsed: true };
}

export function buildSecondaryQualifiedPayload(input: SecondaryPayloadInput) {
  const { lead, agente, source, documentoLink, extra } = input;

  const { iso: reunionDatetimeIso, fallbackUsed } = resolveScheduledAt(lead);


  return {
    // Identificação da organização no receptor
    organizationId: ORGANIZATION_ID,

    // Campos requeridos por el receptor (CRM appointment schema)
    externalId: String(lead.id),
    customerName: lead.nombre_completo ?? '',
    customerPhone: lead.telefono ?? '',
    customerEmail: lead.email ?? null,
    agentEmail: agente?.email ?? '',
    agentName: agente?.nombre ?? null,
    agentPhone: agente?.telefono ?? null,
    scheduledAt: reunionDatetimeIso,
    timezone: lead.zona_horaria_reunion ?? 'Europe/Madrid',
    appointmentPending: fallbackUsed,


    // Metadata / contexto adicional
    event: 'lead.qualified',
    sent_at: new Date().toISOString(),
    source,

    lead: { ...lead },

    agente: agente
      ? {
          id: agente.id,
          nombre: agente.nombre ?? null,
          email: agente.email ?? null,
          telefono: agente.telefono ?? null,

        }
      : null,

    simulador_personal: lead.simulador_personal_data ?? null,
    simulador_hipotecario: lead.simulador_hipotecario_data ?? null,

    reunion: {
      fecha: lead.fecha_reunion ?? null,
      hora: lead.hora_reunion ?? null,
      hora_texto: lead.hora_reunion_texto ?? null,
      zona_horaria: lead.zona_horaria_reunion ?? 'Europe/Madrid',
      datetime_iso: reunionDatetimeIso,
      confidence: lead.reunion_confidence ?? null,
      a_definir: fallbackUsed,

    },

    cualificacion: {
      cualificado: true,
      region_detectada: extra?.region_detectada ?? null,
      edad: extra?.edad ?? null,
    },

    documento_link: documentoLink ?? null,
  };
}


/**
 * Dispatch helper: envia o payload e registra em `webhook_logs`.
 * NUNCA lança — falhas são apenas registradas para não bloquear o fluxo principal.
 */
export async function dispatchSecondaryQualified(
  supabase: any,
  input: SecondaryPayloadInput
): Promise<{ sent: boolean; status?: number; error?: string }> {
  try {
    // GUARD: apenas leads cualificados
    if (!isLeadQualifiedForBitrix(input.lead)) {
      console.log('[secondaryQualified] BLOQUEADO: lead no cualificado', input.lead?.id, input.lead?.stage);
      return { sent: false, error: 'lead_no_cualificado' };
    }

    // Check enabled flag first — skip silently if disabled
    const { data: enabledSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_secondary_qualified_enabled')
      .maybeSingle();

    const enabled = (enabledSetting?.value ?? 'true').toString().toLowerCase() !== 'false';
    if (!enabled) {
      return { sent: false, error: 'disabled' };
    }

    const { data: setting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_secondary_qualified_url')
      .single();

    const url = setting?.value?.trim();
    if (!url) {
      return { sent: false, error: 'not_configured' };
    }

    const payload = buildSecondaryQualifiedPayload(input);

    const bearer = Deno.env.get('WHATSAPP_WEBHOOK_BEARER_TOKEN');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    let errorMessage: string | null = null;
    if (!response.ok) {
      let respBody = '';
      try { respBody = (await response.text()).substring(0, 500); } catch {}
      errorMessage = `HTTP ${response.status}: ${response.statusText} | body: ${respBody}`;
    }

    await supabase.from('webhook_logs').insert({
      webhook_url: `${url} (secondary_qualified)`,
      status: response.ok ? 'success' : 'error',
      error_message: errorMessage,
      payload,
    });

    return { sent: response.ok, status: response.status, error: errorMessage ?? undefined };
  } catch (err: any) {
    console.error('[secondaryQualifiedPayload] dispatch error:', err);
    try {
      await supabase.from('webhook_logs').insert({
        webhook_url: 'webhook_secondary_qualified_url (error)',
        status: 'error',
        error_message: err?.message || 'unknown error',
      });
    } catch {}
    return { sent: false, error: err?.message || 'unknown' };
  }
}
