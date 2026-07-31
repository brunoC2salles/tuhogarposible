// ============================================================================
// SHARED — Builder do payload do webhook SECUNDÁRIO de leads cualificados.
// Enviado em paralelo ao webhook Bitrix, com estrutura estável documentada
// na página de Configuraciones (Admin > Ajustes > Webhook Secundario).
// ============================================================================

const ORGANIZATION_ID = '66d5a3b0-d797-4b8f-ad98-95b75849f799';

export interface SecondaryPayloadInput {
  lead: Record<string, any>;          // linha crua da tabela `leads`
  agente?: Record<string, any> | null; // perfil do agente atribuído
  source: string;                      // 'meta_ads' | 'tally' | 'manual' | 'test'
  documentoLink?: string | null;
  extra?: Record<string, any>;         // metadados adicionais (região, edad, etc.)
}

export function buildSecondaryQualifiedPayload(input: SecondaryPayloadInput) {
  const { lead, agente, source, documentoLink, extra } = input;

  const reunionDatetimeIso =
    lead.reunion_datetime ||
    (lead.fecha_reunion && lead.hora_reunion
      ? `${lead.fecha_reunion}T${lead.hora_reunion}:00`
      : null);

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
    appointmentPending: !lead.hora_reunion,

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
      a_definir: !lead.hora_reunion,
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
