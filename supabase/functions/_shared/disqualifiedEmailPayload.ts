// ============================================================================
// SHARED — Builder do payload do webhook de EMAIL para LEADS DESQUALIFICADOS.
// Dispara automaticamente quando um lead do Meta Ads / Tally é desqualificado
// dentro de meta-lead-webhook. Espelha secondaryQualifiedPayload.ts.
// ============================================================================

export interface DisqualifiedEmailPayloadInput {
  lead: Record<string, any>;   // shape mínimo do lead recém-criado
  razonNoCualificado: string;  // motivo da desqualificação (já calculado em qualificarLead)
  source: string;              // 'meta_ads' | 'tally' | 'tally_housage' | 'test'
}

export function buildDisqualifiedEmailPayload(input: DisqualifiedEmailPayloadInput) {
  const { lead, razonNoCualificado, source } = input;

  return {
    event: 'lead.disqualified',
    sent_at: new Date().toISOString(),
    source,

    lead: {
      id: String(lead.id ?? ''),
      nombre_completo: lead.nombre_completo ?? '',
      telefono: lead.telefono ?? '',
      email: lead.email ?? '',
      ciudad_interes: lead.ciudad_interes ?? null,
      zona_interes: lead.zona_interes ?? null,
      created_at: lead.created_at ?? new Date().toISOString(),
    },

    cualificacion: {
      cualificado: false,
      razon_no_cualificado: razonNoCualificado || null,
    },
  };
}

/**
 * Dispatch helper: envia o payload e registra em `webhook_logs`.
 * NUNCA lança — falhas são apenas registradas para não bloquear o fluxo principal.
 */
export async function dispatchDisqualifiedEmail(
  supabase: any,
  input: DisqualifiedEmailPayloadInput
): Promise<{ sent: boolean; status?: number; error?: string }> {
  try {
    // Check enabled flag first — skip silently if disabled
    const { data: enabledSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_disqualified_email_enabled')
      .maybeSingle();

    const enabled = (enabledSetting?.value ?? 'true').toString().toLowerCase() !== 'false';
    if (!enabled) {
      return { sent: false, error: 'disabled' };
    }

    const { data: setting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_disqualified_email_url')
      .single();

    const url = setting?.value?.trim();
    if (!url) {
      return { sent: false, error: 'not_configured' };
    }

    const payload = buildDisqualifiedEmailPayload(input);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let errorMessage: string | null = null;
    if (!response.ok) {
      let respBody = '';
      try { respBody = (await response.text()).substring(0, 500); } catch {}
      errorMessage = `HTTP ${response.status}: ${response.statusText} | body: ${respBody}`;
    }

    await supabase.from('webhook_logs').insert({
      webhook_url: `${url} (disqualified_email)`,
      status: response.ok ? 'success' : 'error',
      error_message: errorMessage,
      payload,
    });

    return { sent: response.ok, status: response.status, error: errorMessage ?? undefined };
  } catch (err: any) {
    console.error('[disqualifiedEmailPayload] dispatch error:', err);
    try {
      await supabase.from('webhook_logs').insert({
        webhook_url: 'webhook_disqualified_email_url (error)',
        status: 'error',
        error_message: err?.message || 'unknown error',
      });
    } catch {}
    return { sent: false, error: err?.message || 'unknown' };
  }
}
