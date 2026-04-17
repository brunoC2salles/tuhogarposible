

Perfeito. Vou avançar com:
- `BEWOR_BASE_URL` = `https://extractor.bewor.tech`
- `BEWOR_EMAIL` = `apuig@apuntogrowthgroup.com`
- `BEWOR_PASSWORD` = `ES9OWtegb2U7QnGexlu7KZ2Tw`
- `BEWOR_WEBHOOK_SECRET` = `bwr_7k3n9p2q4r8s1t5w6x0y3z7a2b4c8d1e` (gerado por mim)

Próximos passos depois dos secrets adicionados:

1. Edge function `bewor-admin-token` — admin roda 1x para fazer login na Bewor e gerar o JWT third-party (vai pedir 1 secret extra `BEWOR_THIRD_PARTY_JWT` depois disso)
2. Edge functions `bewor-public-upload`, `bewor-webhook`, `bewor-get-token-info`
3. Página pública `/documentos/:token` com branding
4. Modal "Solicitar Documentos" + aba "Análisis Bewor" no `LeadDetailsModal`
5. Hook realtime `useLeadDocumentAnalysis` para atualizar UI quando webhook chegar

Vou pedir os 4 secrets agora numa só ação.

