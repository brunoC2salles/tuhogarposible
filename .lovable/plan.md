

## Resposta directa

**Sim, posso fazer isso.** É uma operação segura e de uma só passagem (one-shot), sem alterações de código. Antes de avançar quero mostrar-te exactamente o que encontrei na BD para que aprovês com dados reais à frente.

## O que encontrei nos últimos 4 dias

- **198** leads descualificados no total
- **5** descualificados *especificamente* pela regra antiga de ahorros (`"Sin ahorros declarados para cubrir impuestos de compraventa"`)
  - **3** declararam um valor numérico de ahorros > 0 (ex.: `4000€`, `3000€`)
  - **2** responderam literalmente "no" / "no tengo" → estes **continuam corretamente descualificados**
- **0** disseram apenas "sí" sem número (esse caso teórico não ocorreu na janela)

Os outros 193 foram descualificados por outras razões legítimas (antigüedad < 1 año, fichero de morosidad, contrato temporal, edad, etc.) e **não** devem ser tocados.

## Candidatos a recuperar (3 leads)

Vou listar-te os 3 candidatos exactos no chat antes de executar, para confirmares um a um. Pré-visualização:

| Nome | Email | Cidade | Ahorros declarados |
|---|---|---|---|
| Karim | samirlotfi2907@gmail.com | Sevilla | 4.000€ |
| _(2 mais — mostro a lista completa antes de executar)_ | | | |

## Plano de execução (uma só vez, sem alterar código)

1. **Listar e confirmar contigo os 3 leads exatos** (com nome, email, telefone, cidade e valor declarado) antes de tocar em nada.
2. **Atribuir agente** via `get-next-agent` para cada lead (round-robin pela CCAA detectada da `ciudad_interes`/`zona_interes`). Se a CCAA não for inferível, uso fallback por cobertura — mesma lógica do webhook Meta.
3. **Mover stage** `descualificados` → `nuevo_lead` e gravar `agente_asignado_id`. Vou anotar em `notas` uma linha de auditoria: `[RECUPERADO 2026-04-21] Re-cualificado por nueva regla de ahorros (declaró Xxxx€)`.
4. **Disparar webhooks Bitrix/Make**:
   - `make-webhook-proxy` com `action: 'send_lead_assignment'` para cada um (mesmo webhook que dispara em reasignación manual — já vai ao Bitrix24 via Make).
5. **Notificar agentes** automaticamente — já é feito pelo trigger `notify_lead_reassignment` na BD assim que `agente_asignado_id` muda. Sem trabalho extra.
6. **Relatório final no chat** com: leads movidos, agentes atribuídos, status de cada webhook (success/error) consultando `webhook_logs`.

## O que NÃO vou fazer

- ❌ Não toco nos 195 leads descualificados por outras razões.
- ❌ Não altero código nem regras (a regra do webhook já foi corrigida na entrega anterior — isto é só limpar o histórico recente).
- ❌ Não envio email/SMS aos leads — só atribuo, movo de stage e disparo webhook interno do Bitrix.

## Detalhes técnicos (para referência)

- Query de seleção: `stage = 'descualificados' AND updated_at > now() - interval '4 days' AND notas ILIKE '%Sin ahorros declarados%' AND notas ~* 'Ahorros para impuestos:\s*[^-\n]*\d+'`
- Atribuição: `supabase.functions.invoke('get-next-agent', { body: { region: <CCAA detectada>, considerarTurno: false } })`
- Update: `update leads set stage='nuevo_lead', agente_asignado_id=<id>, notas=notas || E'\n[RECUPERADO ...]' where id=...` (single statement, idempotente)
- Webhook: `supabase.functions.invoke('make-webhook-proxy', { body: { action: 'send_lead_assignment', lead_id, agente_id } })` — exatamente como em `reassignLead` (`useLeads.ts`)
- Auditoria: `lead_historico` é populado automaticamente pelo trigger `log_lead_stage_change` quando o stage mudar.
- Reversibilidade: cada movimento fica registado em `lead_historico`; rollback por id é trivial se algo correr mal.

## Próximo passo se aprovares

Execução em duas fases:
1. Mostro-te a tabela completa dos 3 leads → tu confirmas.
2. Executo tudo e devolvo o relatório.

