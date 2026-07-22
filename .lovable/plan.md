
## Objetivo

Na página **Admin > Ajustes**, adicionar duas capacidades:

1. Um **switch para habilitar/desabilitar** o envio do webhook WhatsApp (o secundário).
2. Um **botão para gerar o relatório de qualificação de leads** (mesmo formato dos relatórios semanais que venho entregando), com preset de "últimos 7 días" e opção de escolher un período customizado.

Sem tocar em nenhuma lógica fora desses dois pontos.

---

## 1. Toggle do Webhook WhatsApp

### Comportamento
- Nova chave em `admin_settings`: `webhook_secondary_qualified_enabled` (valor `"true"` / `"false"`, default `"true"` para não mudar o comportamento atual).
- Quando `false`: `dispatchSecondaryQualified` retorna imediatamente `{ sent: false, error: 'disabled' }` **sem** fazer POST e **sem** gravar em `webhook_logs` (skip silencioso, conforme escolhido).
- Bitrix e resto do fluxo não são afetados.

### UI (`src/pages/AdminSettings.tsx`)
- Adicionar um `Switch` (shadcn) ao lado do título da seção "Webhook WhatsApp".
- Label: "Envio activo" / "Envio pausado".
- Ao alternar, salva na tabela `admin_settings` via hook.

### Hook (`src/hooks/useAdminSettings.ts`)
- Novo estado `secondaryEnabled: boolean` + `setSecondaryEnabled(enabled: boolean)` que faz upsert em `admin_settings`.
- Fetch inicial junto com os outros settings.

### Edge function
- `supabase/functions/_shared/secondaryQualifiedPayload.ts`: antes de ler a URL, ler a flag; se desabilitado, `return { sent: false, error: 'disabled' }`.

---

## 2. Botão "Gerar informe semanal"

### UI (nova seção em `AdminSettings.tsx`, acima ou abaixo das seções de webhook)
- Título: **Informe de cualificación de leads**.
- Dois modos:
  - Botão primário: **"Generar informe (últimos 7 días)"**.
  - Bloco secundário: dois `DatePicker` (Fecha inicio / Fecha fin) + botão **"Generar informe personalizado"**.
- Ao clicar, chama uma nova edge function `generate-leads-report` passando `{ start_date, end_date }` (YYYY-MM-DD, Europe/Madrid).
- A resposta é um PDF (base64 ou binário) — o front converte para Blob e dispara download.
- Toast de progresso/erro.

### Edge function: `supabase/functions/generate-leads-report/index.ts` (nova)
- Auth: requer JWT de admin (usa `has_role`).
- Recebe `start_date` e `end_date` (fallback: últimos 7 dias em Europe/Madrid).
- Query única em `leads` filtrando por `(created_at AT TIME ZONE 'Europe/Madrid')::date BETWEEN ...` (respeita regra de calendário Madrid da memory).
- Métricas calculadas:
  - Total de leads no período, por dia.
  - Cualificados vs descualificados (por stage: cualificado = `stage != 'descualificados'`).
  - Breakdown por `source` (meta_ads, tally, manual).
  - Top motivos de descualificação (parseando `notas` — mesmos padrões que uso nos relatórios manuais: edad, ingresos, ahorros, antigüedad, contrato, deudas).
  - Cruzamento com `webhook_logs` (status='success' filtrando pelo webhook Bitrix) — quantos cualificados chegaram efetivamente ao Bitrix.
- Gera PDF em espanhol usando `jspdf` (mesma lib já em uso no projeto para `invoicePdfGenerator`).
- Retorna `{ pdf_base64, filename }`.

### Formato do PDF (espanhol, minimalista, azul primário)
1. Título + período coberto.
2. Resumen ejecutivo (total, cualificados, descualificados, tasa, enviados a Bitrix).
3. Tabla por día (fecha | total | cualificados | descualificados).
4. Tabla por fuente (meta_ads / tally / manual).
5. Top motivos de descualificación con conteos.
6. Nota de metodología (días de calendario Europe/Madrid).

---

## Migração de dados (não schema)

Uma única inserção em `admin_settings` para criar a chave `webhook_secondary_qualified_enabled = 'true'` se não existir (via ferramenta insert, não migration).

---

## Detalhes técnicos

- **Arquivos novos:**
  - `supabase/functions/generate-leads-report/index.ts`
- **Arquivos alterados:**
  - `src/pages/AdminSettings.tsx` (nova seção relatório + switch webhook)
  - `src/hooks/useAdminSettings.ts` (estado do enabled + toggle)
  - `supabase/functions/_shared/secondaryQualifiedPayload.ts` (checa flag)
- **Sem mudanças** em: fluxo Meta/Tally, Bitrix, qualificação, tabela `leads`.

---

## Perguntas que ficaram

Nenhuma — todas resolvidas nas respostas anteriores. Prossigo assim que aprovado.
