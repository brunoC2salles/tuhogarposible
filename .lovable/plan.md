## Objetivo
Incluir o campo `organizationId` no JSON enviado ao webhook de WhatsApp (webhook secundário de leads cualificados).

## Alteração
Em `supabase/functions/_shared/secondaryQualifiedPayload.ts`, dentro de `buildSecondaryQualifiedPayload`, adicionar como primeiro campo raiz do objeto retornado:

```
organizationId: "66d5a3b0-d797-4b8f-ad98-95b75849f799"
```

Fica junto dos campos requeridos pelo receptor (`externalId`, `customerName`, ...), aplicando-se automaticamente a todos os envios: leads do Meta Ads, Tally, reprocessamentos e o botão de teste na página de Ajustes.

## Detalhes técnicos
- Valor fixo em constante no topo do arquivo (`const ORGANIZATION_ID = '...'`) para facilitar futura troca.
- Redeploy da edge function que importa o shared (`meta-lead-webhook`, `make-webhook-proxy`, `reprocess-meta-leads`).
- Nenhuma mudança de banco de dados nem de UI.
