

## Diagnóstico

Ao clicar em "Generar JWT Bewor" a edge function falha com:
```
TypeError: supabase.auth.getClaims is not a function
```

Investigando os logs **e** comparando o código com a documentação oficial Bewor (PDF + Postman), encontrei **3 bugs críticos** em todas as 3 edge functions:

### Bug 1 — Validação admin quebrada (`bewor-admin-token`)
Uso `supabase.auth.getClaims(token)` que não existe no SDK v2.45. O método correto é `supabase.auth.getUser(token)`.

### Bug 2 — URLs erradas (todas as 3 functions)
A documentação Bewor é clara: **todos os endpoints começam com `/api/v1/`**.

| Endpoint | Código atual (errado) | Correto (docs) |
|---|---|---|
| Login | `POST /auth/login` | `POST /api/v1/login` |
| Criar token | `POST /third-party/token` | `POST /api/v1/company/token` |
| Criar request | `POST /third-party/request` | `POST /api/v1/third-party/request` |
| Obter request | `GET /third-party/request/{id}` | `GET /api/v1/third-party/request/{id}` |

### Bug 3 — Campos do payload errados
- Login retorna `{ token: "..." }` — código procura `access_token`
- Upload manda `type: "bank_statements"` — Bewor exige `"movimientos_bancarios"` (espanhol, conforme docs e Postman)
- Upload manda `webhook_url` — está OK ✓ (mas faltava header `Accept: application/json`)
- Faltam headers `Accept: application/json` em todas chamadas (docs exigem)

## Plano de Correção

### 1. Corrigir `bewor-admin-token/index.ts`
- Trocar `supabase.auth.getClaims(token)` → `supabase.auth.getUser(token)`
- `POST /auth/login` → `POST /api/v1/login`
- `POST /third-party/token` → `POST /api/v1/company/token`
- Ler `loginData.token` (não `access_token`)
- Adicionar header `Accept: application/json` em ambas chamadas
- Body do token continua `{ name: "Tu Hogar Posible CRM" }` ✓

### 2. Corrigir `bewor-public-upload/index.ts`
- `POST /third-party/request` → `POST /api/v1/third-party/request`
- `type: "bank_statements"` → `type: "movimientos_bancarios"`
- Adicionar header `Accept: application/json`
- Manter resto da lógica intacta (storage, token, webhook URL com secret)

### 3. Corrigir `bewor-webhook/index.ts`
- `GET /third-party/request/{id}` → `GET /api/v1/third-party/request/{id}`
- Adicionar header `Accept: application/json`
- Resto da lógica (extração income/debts, cálculo viabilidade, notificações) está OK ✓

## O que NÃO vou tocar
- Schema do DB (tabelas `lead_document_analysis`, `lead_document_tokens`) — está correto
- Componentes React (`RequestDocumentsModal`, `BeworAnalysisTab`, `PublicDocumentUpload`) — não são afetados
- Hooks (`useLeadDocumentAnalysis`, `useLeadDocumentTokens`) — não são afetados
- Botão "Generar JWT" no `AdminSettings` — está correto, só a function falhava
- Outros secrets — todos já configurados

## Após a correção

Você clica novamente em "Generar JWT Bewor" no Admin Settings → o token será exibido → você adiciona como secret `BEWOR_THIRD_PARTY_JWT` → fluxo end-to-end funcionará.

