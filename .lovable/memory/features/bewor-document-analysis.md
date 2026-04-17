---
name: Bewor document analysis integration
description: OCR-based bank statement analysis via Bewor API. Public token link, async webhook, automatic mortgage viability suggestion.
type: feature
---
Integration with Bewor Extractor (https://extractor.bewor.tech) for automatic OCR analysis of client bank statements (movimientos bancarios).

**Flow:**
1. Agent opens lead → tab "Análisis" → "Solicitar documentos" → generates a 32-char token (table `lead_document_tokens`, expires 7 days)
2. Public link `/documentos/:token` lets the client upload a PDF (≤5MB) — no auth needed
3. Edge fn `bewor-public-upload` validates token, stores PDF in `lead-documents` bucket at `bewor/{lead_id}/{analysis_id}.pdf`, calls Bewor `/third-party/request` with webhook URL containing our `BEWOR_WEBHOOK_SECRET` query param
4. Bewor processes async, calls `bewor-webhook?secret=...&analysis_id=...` when FINISHED
5. Webhook validates secret, GETs full result, computes hybrid mortgage viability (35% DTI, 30y at 3.5%, cap 180k or 210k exclusive), stores in `lead_document_analysis.viabilidade_sugerida`, notifies agent + admins via `document_analysis_completed` notification type

**Tables:**
- `lead_document_tokens` (token, expires_at, used_at) — RLS: agent of lead, admin, supervisor
- `lead_document_analysis` (status: CREATED/PROCESSING/FINISHED/ERROR, result jsonb, viabilidade_sugerida jsonb) — Realtime enabled

**Edge functions (all verify_jwt=false except bewor-admin-token):**
- `bewor-admin-token` — admin-only, runs once to login + create third-party JWT, must be saved as secret `BEWOR_THIRD_PARTY_JWT`
- `bewor-get-token-info` — public, returns lead name for branded landing
- `bewor-public-upload` — public, accepts PDF + token, forwards to Bewor
- `bewor-webhook` — public, validated by `BEWOR_WEBHOOK_SECRET` query param

**Secrets:** BEWOR_BASE_URL, BEWOR_EMAIL, BEWOR_PASSWORD, BEWOR_WEBHOOK_SECRET, BEWOR_THIRD_PARTY_JWT (added after admin runs bewor-admin-token once)

**Frontend:**
- Page: `src/pages/PublicDocumentUpload.tsx` (route `/documentos/:token`) with Logo + drag/drop upload
- Modal: `src/components/crm/RequestDocumentsModal.tsx` — generates link + WhatsApp/Email shortcuts
- Tab: `src/components/crm/BeworAnalysisTab.tsx` in LeadDetailsModal — shows realtime status + viability verdict
- Hooks: `useLeadDocumentTokens`, `useLeadDocumentAnalysis` (with Postgres realtime subscription)

**Constraints:** Only PDF, ≤5MB, validated client+server. Token usable until expires_at; marked `used_at` after successful Bewor upload but link still works for re-uploads. Hybrid: automatic suggestion shown to agent, agent decides whether to apply.
