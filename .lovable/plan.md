## Objetivo

1. Identificar de forma inequívoca no pipeline de qualificação quando um lead vem do **Tally** (vs Meta Ads).
2. Evitar que o **mesmo lead** (mesmo telefone/email) seja enviado ao Bitrix duas vezes num curto intervalo quando preenche Tally **e** o formulário do Meta.

Sem alterar o cenário do Make além de adicionar um campo no JSON do HTTP.

---

## Parte 1 — Marcar leads como "tally"

### 1.1 No Make (HTTP → `/functions/v1/meta-lead-webhook`)

Adicionar **um único campo** no JSON:

```json
"source_origin": "tally"
```

Isto reaproveita a chave `source_origin` que o webhook já entende (hoje só reconhece `tally_housage`).

### 1.2 No `meta-lead-webhook/index.ts`

- Detectar `source_origin === 'tally'` (além do já existente `tally_housage`).
- Ao inserir o lead:
  - `source: 'tally'` (novo valor do enum).
  - `notas` começa com `[Tally]` em vez de `Lead do Meta Ads.`
- No payload devolvido ao Make/Bitrix, incluir `lead_source: 'tally' | 'meta_ads' | 'tally_housage'` para que o node de Bitrix possa preencher a campo "Origen".

### 1.3 Enum no banco

Adicionar `'tally'` ao enum `lead_source` (Supabase). Migração:

```sql
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'tally';
```

E atualizar `src/types/crm.ts` (`LeadSource`) e o filtro de origem no CRM (se existir badge).

---

## Parte 2 — Deduplicação Tally ↔ Meta Ads

### 2.1 Regra

Antes de inserir um lead novo no `meta-lead-webhook`, procurar em `leads`:

- `telefono` normalizado igual (só dígitos, últimos 9) **OU** `email` igual (case-insensitive)
- `created_at >= now() - interval '48 hours'`

Se encontrar match:

1. **Não** cria novo lead.
2. **Não** dispara webhook Bitrix (retorna `duplicated: true`, `existing_lead_id`).
3. Anexa uma linha nas `notas` do lead existente:  
   `[Duplicado ignorado 2026-07-15 08:20 | origen: tally] — mesmo teléfono/email recibido nuevamente.`
4. Se o lead existente estava em `descualificados` e o novo cumpre qualificação, **promove** para `nuevo_lead` e dispara o webhook Bitrix uma única vez (evita perder um lead bom que primeiro chegou "ruim").
5. Resposta HTTP 200 (para o Make não marcar erro) com `duplicated: true`.

### 2.2 Janela configurável

Constante no topo do webhook:

```ts
const DEDUP_WINDOW_HOURS = 48;
```

Fácil de ajustar se detectarmos casos legítimos (ex.: mesmo email em famílias).

### 2.3 Normalização de telefone

Helper `normalizePhone(x)` que:
- remove tudo que não é dígito;
- descarta prefixo `34` de Espanha;
- compara pelos últimos 9 dígitos.

Isto neutraliza variações `+34 612…`, `0034612…`, `612 34 56 78`.

### 2.4 Índice de apoio

Migração:

```sql
CREATE INDEX IF NOT EXISTS idx_leads_telefono_created ON public.leads (telefono, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email_created ON public.leads (lower(email), created_at DESC);
```

---

## Parte 3 — Observabilidade

- Log estruturado `[meta-lead-webhook][dedup] match phone/email lead_id=…` para conseguirmos auditar depois.
- Contador simples: incluir na resposta `{ duplicated: true, reason: 'phone_match' | 'email_match', existing_lead_id, existing_source }`.

---

## Ficheiros a alterar

- `supabase/functions/meta-lead-webhook/index.ts` — reconhecer `source_origin='tally'`, dedup, resposta.
- `supabase/functions/tally-housage-webhook/index.ts` — passa também a mandar `source_origin: 'tally_housage'` (já manda) — nenhuma mudança funcional, só garantir que a dedup se aplica igual.
- `src/types/crm.ts` — adicionar `'tally'` a `LeadSource`.
- Migração SQL — extender enum + índices.

## O que o utilizador tem de fazer no Make

Apenas adicionar `"source_origin": "tally"` no corpo JSON do módulo HTTP do cenário do Tally. Nada mais.
