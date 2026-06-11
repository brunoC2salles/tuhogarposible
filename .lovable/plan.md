## Diagnóstico do erro de webhook

Os 400 do print são todos do fluxo **descualificados**, não do envio de leads qualificados ao Bitrix. Como você decidiu eliminar esse fluxo, o erro desaparece junto. Os qualificados (`meta_bitrix`) continuam retornando sucesso normalmente.

## Mudanças

### 1. Remover totalmente o webhook de descualificados
- Apagar a edge function `disqualified-lead-webhook`.
- Remover a chamada automática dentro de `meta-lead-webhook` (bloco "DISPARO AUTOMÁTICO").
- Remover `triggerDisqualifiedWebhook` em `useLeads.ts`.
- Remover do `AdminSettings` a seção "Leads Descualificados" (input, botão Guardar, botão Probar).
- Limpar do `useAdminSettings` os estados `disqualifiedWebhookUrl`, `testDisqualifiedWebhook`, etc.
- Apagar a chave `webhook_disqualified_url` de `admin_settings`.

### 2. Novos campos de agendamento de reunião (Meta Ads)
Vamos criar e usar estes campos padronizados (você passa esses nomes para o JSON do node HTTP do Bitrix no Make):

| Campo na plataforma           | O que é                                              |
|-------------------------------|------------------------------------------------------|
| `fecha_reunion`               | Data da reunião escolhida pelo lead (YYYY-MM-DD)     |
| `hora_reunion`                | Hora da reunião (HH:MM, 24h)                         |
| `zona_horaria_reunion`        | Timezone, default `Europe/Madrid`                    |
| `reunion_datetime`            | Timestamp combinado (gerado automaticamente)         |

Implementação:
- **Banco**: adicionar `fecha_reunion DATE`, `hora_reunion TIME`, `zona_horaria_reunion TEXT DEFAULT 'Europe/Madrid'`, `reunion_datetime TIMESTAMPTZ` na tabela `leads`.
- **`meta-lead-webhook`**:
  - Aceitar `fecha_reunion`, `hora_reunion`, `zona_horaria_reunion` (e aliases comuns: `meeting_date`, `meeting_time`, `fecha`, `hora`).
  - Tolerar formatos comuns (`DD/MM/YYYY`, `YYYY-MM-DD`, `HH:MM`, `HH:MM:SS`, "10:30 AM").
  - Salvar no lead e calcular `reunion_datetime`.
- **`bitrixPayload.ts`** (compartilhado): incluir no payload enviado ao Bitrix:
  - `lead_fecha_reunion`
  - `lead_hora_reunion`
  - `lead_zona_horaria_reunion`
  - `lead_reunion_datetime` (ISO 8601 com timezone)
- **CRM (LeadDetailsModal / LeadCard)**: mostrar dia e hora da reunião quando existirem.

### 3. Corrigir domínios antigos nos payloads
Substituir nos arquivos compartilhados e edge functions:
- `https://tu-hogar-vista.lovable.app/...` → `https://tuhogarposible.lovable.app/...`
- Remover links de `inventariotuhogarposible.vercel.app` e bloco de recomendações dos payloads (inventário foi descontinuado).

### 4. Reenvio em massa dos qualificados que falharam
- Nova ação `replay_qualified_since` na edge function `make-webhook-proxy`:
  - Parâmetro `since` (ISO datetime). Padrão sugerido: `2026-06-08T11:49:00Z` (primeiro erro recente).
  - Busca leads criados a partir de `since` com `stage <> 'descualificados'`.
  - Para cada lead, verifica se já existe log com `status='success'` e `payload->>'lead_id' = lead.id` para evitar duplicar deal no Bitrix.
  - Reenvia usando `buildBitrixPayloadFromLead` (mesmo payload do envio em tempo real).
  - Loga cada envio como `source: 'replay_qualified'`.
  - Retorna resumo: `total, skipped_already_sent, sent_ok, sent_failed`.
- Novo card no `AdminSettings`: **"Reenviar leads qualificados"** com seletor de data/hora (default 08/06/2026 11:49 UTC), botão "Reenviar" e exibição do resultado.

### 5. Melhorar log de erros do Make
Quando o Make responder com erro, gravar também os primeiros 500 chars do corpo da resposta no `error_message`. Hoje só vemos `HTTP 400: Bad Request`, sem motivo.

## Mudanças no Make (do seu lado, depois que eu publicar)
1. **Cenário de descualificados**: pode desativar/apagar, não vai mais receber chamadas.
2. **Cenário Meta Ads → Bitrix**: no node HTTP que monta o deal, adicionar os novos campos vindos do payload:
   - `lead_fecha_reunion`, `lead_hora_reunion`, `lead_zona_horaria_reunion`, `lead_reunion_datetime`.
3. **Formulário Meta Ads**: garantir que o passo de agendamento envia data e hora ao Make, e o Make os repassa como `fecha_reunion` e `hora_reunion` no body para a nossa edge function.

Posso seguir com a implementação?