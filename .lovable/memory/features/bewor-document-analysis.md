---
name: Bewor document analysis integration
description: OCR bank statement analysis. Connection 100% functional but `movimientos_bancarios` type only validates documents. Type tunable via BEWOR_REQUEST_TYPE env. Honest client error when no calculation. Standalone panel removed from CRM.
type: feature
---
Integration with Bewor Extractor (https://extractor.bewor.tech) for automatic OCR analysis of client bank statements (movimientos bancarios).

## Connection status (2026-04-18)
- Connection: ✅ HTTP 200, request_id válido, status OK, confidence ~95%
- Validação documental: ✅ banco, IBAN, titular, período extraídos
- Extração financeira: ❌ `records: []`, `idNumber: ""`, `financial_alerts: []` — type `movimientos_bancarios` só dispara módulo de validação documental, não a extração financeira. Pode precisar de outro type ou de activação do módulo financeiro pela Bewor.

## Instrumentação activa
`bewor-public-upload/index.ts` lê env var `BEWOR_REQUEST_TYPE` (default `movimientos_bancarios`) para testar variantes (`cashflow`, `financial_analysis`, etc.) sem redeploy. Faz log completo da resposta da Bewor + tenta `GET /third-party/types` (e variantes) para descobrir capacidades da conta.

## Flow
1. Agent opens lead → tab "Análisis" → "Solicitar documentos" → generates a 32-char token (table `lead_document_tokens`, expires 7 days)
2. Public link `/documentos/:token` lets the client upload a PDF (≤10MB) — no auth needed
3. Edge fn `bewor-public-upload` validates token, stores PDF in `lead-documents` bucket at `bewor/{lead_id|standalone}/{analysis_id}.pdf`, calls Bewor `/third-party/request` with type from env + webhook URL containing `BEWOR_WEBHOOK_SECRET`
4. Bewor processes async, calls `bewor-webhook?secret=...&analysis_id=...` when FINISHED
5. Webhook validates secret, GETs full result, stores in `lead_document_analysis.viabilidade_sugerida`, notifies agent + admins via `document_analysis_completed`

## Mensagem ao cliente (PublicDocumentUpload + bewor-public-status)
- Se Bewor devolveu cálculo real (`ingresos > 0` E `hipoteca_maxima > 0`): mostra hipoteca máxima + cuota.
- Senão: **erro honesto** "Hubo un problema procesando tu extracto. Por favor, contacta con tu agente para que te ayude a subir el documento correcto." + botão "Subir otro documento". Removida a badge verde "Documento validado" sem cálculo.

## Painel admin
`/admin/verificaciones-extractos` mostra colunas: Cliente, Banco, IBAN, Período, Estado, **Records** (n), **Ingresos Bewor**, **Hipoteca máx.**, Fecha. Edição manual de DNI e ingressos no detalhe.

## CRM cleanup
`StandaloneAnalysisPanel` e `StandaloneDocsButton` removidos do `AdminCRM.tsx`. Standalone fica apenas via `/admin/verificaciones-extractos`. Hooks `useStandaloneAnalysis` ficam no codebase mas sem uso no CRM.

## Tables
- `lead_document_tokens` (token, expires_at, used_at, lead_id nullable para standalone) — RLS: agent of lead, admin, supervisor
- `lead_document_analysis` (status, result jsonb, viabilidade_sugerida jsonb, lead_id nullable) — Realtime enabled

## Edge functions (verify_jwt=false except bewor-admin-token)
- `bewor-admin-token` — admin-only, login + create third-party JWT, salvar como secret `BEWOR_THIRD_PARTY_JWT`
- `bewor-get-token-info` — public, retorna nome do lead
- `bewor-public-upload` — public, aceita PDF + token, instrumentado, type configurável
- `bewor-public-status` — public, polling do cliente. Se sem cálculo → inconclusive com mensagem honesta
- `bewor-webhook` — public, validated by secret query param

## Secrets
BEWOR_BASE_URL, BEWOR_EMAIL, BEWOR_PASSWORD, BEWOR_WEBHOOK_SECRET, BEWOR_THIRD_PARTY_JWT, BEWOR_REQUEST_TYPE (opcional, default `movimientos_bancarios`)
