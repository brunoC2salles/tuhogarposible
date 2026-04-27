---
name: Internal bank statement analysis
description: Bewor was replaced by the internal AI bank statement reader with public token upload links and standalone testing links.
type: feature
---
The platform now uses an internal bank statement reader instead of the Bewor API for new analyses.

## Current flow
1. When a lead reaches `lead_cualificado`, the database trigger generates a public document token in `lead_document_tokens`.
2. The public link `/documentos/:token` lets the client upload up to 3 PDF bank statements covering the last 12 months.
3. The public upload function stores PDFs in `lead-documents` and analyzes them with structured AI through Lovable AI Gateway.
4. Results are stored in `lead_document_analysis` with `analysis_provider = 'internal'`, including holder data, IBAN, bank, detected months, income, debts/credits, savings, confidence and suggested viability.
5. Public results show only approval status and maximum mortgage. Admin/CRM views show detailed extracted financials.

## Standalone verification
`/admin/verificaciones-extractos` can create standalone verification links for leads that are not in the CRM and for tests. These tokens have `lead_id = null`; uploaded analyses remain visible as “Sin lead vinculado” and may later be linked manually if needed.

## Business rules
- PDF only.
- Maximum 3 documents per analysis.
- Requires 12 complete months; otherwise the lead sees the incomplete-statement message.
- Supports 1 or 2 holders. For 2 holders, income, debts/credits and savings are summed.
- Mortgage calculation uses 35% DTI, 2.5% annual rate, 30 years, capped at 180k€ for 1 holder and 210k€ for 2 holders.

## Compatibility
Some function/component names still contain `bewor` for route compatibility with existing public links, but new operational logic is internal and must not call the Bewor external API.
