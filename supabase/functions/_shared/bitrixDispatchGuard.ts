// Fonte única de verdade para evitar envios duplicados ao Bitrix.
// Cada lead só pode gerar UMA negociação (create). Qualquer envio posterior
// é marcado como atualização (update), com dedupe_key = lead_id, para que o
// Make/Bitrix atualize a negociação existente em vez de criar outra.

export type DispatchKind = 'create' | 'resend' | 'reassign';

export interface DispatchClaim {
  allowed: boolean;
  isUpdate: boolean;
  sendCount: number;
  previousAgentId: string | null;
  reason?: string;
}

export async function claimBitrixDispatch(
  supabase: any,
  leadId: string,
  agentId: string | null,
  kind: DispatchKind,
): Promise<DispatchClaim> {
  try {
    const { data: existing } = await supabase
      .from('bitrix_dispatches')
      .select('id, agent_id, send_count')
      .eq('lead_id', leadId)
      .maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabase.from('bitrix_dispatches').insert({
        lead_id: leadId,
        agent_id: agentId,
        last_kind: kind,
      });
      if (insErr) {
        // Corrida: outro processo criou a ficha no mesmo instante → é duplicado
        if ((insErr as any).code === '23505') {
          return {
            allowed: false,
            isUpdate: false,
            sendCount: 1,
            previousAgentId: null,
            reason: 'already_dispatched_race',
          };
        }
        console.error('[bitrixDispatchGuard] erro ao registrar envio:', insErr);
        // Não bloquear o fluxo por falha de bookkeeping
        return { allowed: true, isUpdate: false, sendCount: 1, previousAgentId: null };
      }
      return { allowed: true, isUpdate: false, sendCount: 1, previousAgentId: null };
    }

    // Já existe negociação no Bitrix para este lead
    if (kind === 'create') {
      return {
        allowed: false,
        isUpdate: true,
        sendCount: existing.send_count,
        previousAgentId: existing.agent_id ?? null,
        reason: 'already_dispatched',
      };
    }

    const nextCount = (existing.send_count || 1) + 1;
    await supabase
      .from('bitrix_dispatches')
      .update({
        agent_id: agentId ?? existing.agent_id,
        last_sent_at: new Date().toISOString(),
        send_count: nextCount,
        last_kind: kind,
      })
      .eq('id', existing.id);

    return {
      allowed: true,
      isUpdate: true,
      sendCount: nextCount,
      previousAgentId: existing.agent_id ?? null,
    };
  } catch (err) {
    console.error('[bitrixDispatchGuard] exceção:', err);
    return { allowed: true, isUpdate: false, sendCount: 1, previousAgentId: null };
  }
}

// Campos que devem acompanhar todo payload para o Make deduplicar no Bitrix
export function withDispatchMeta(
  payload: Record<string, any>,
  leadId: string,
  claim: DispatchClaim,
): Record<string, any> {
  return {
    ...payload,
    dedupe_key: leadId,
    bitrix_operation: claim.isUpdate ? 'update' : 'create',
    is_resend: claim.isUpdate ? 'true' : 'false',
    envio_numero: String(claim.sendCount),
    agente_anterior_id: claim.previousAgentId || '',
  };
}
