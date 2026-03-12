
# Plano de Implementacao: Dados de Mercado Integrados

## Status: ✅ IMPLEMENTADO

### Ficheiros Criados
- `src/data/datos_raw.json` — Dados brutos (~162k registos, ~7k municípios com tipo=99, clase=99)
- `src/data/marketPrices.ts` — Módulo de lazy-loading e processamento dos dados
- `src/lib/marketPriceUtils.ts` — Utilitários: lookup, comparação, formatação, badges
- `src/hooks/useMarketPrices.ts` — Hook React para carregamento lazy dos dados
- `supabase/functions/_shared/marketPrices.ts` — Lookup compacto por província para edge functions

### Ficheiros Modificados
- `src/components/simuladores/ResultadosSimulacionHipotecaria.tsx` — Secção "Contexto de Mercado" nos resultados
- `src/components/crm/RecomendacionesModal.tsx` — Badge de mercado em cada imóvel recomendado
- `src/components/inventario/InmuebleCard.tsx` — Prop `marketComparison` para badge de mercado
- `supabase/functions/meta-lead-webhook/index.ts` — Validação de presupuesto + dados de mercado no payload Bitrix

### Funcionalidades
1. **Simulador**: Mostra preço médio da comunidade autónoma e desvio percentual
2. **Recomendações CRM**: Badge colorido (verde=abaixo média, amarelo=acima, vermelho=muito acima)
3. **Webhook Meta Ads**: Valida se o orçamento é realista para a zona, adiciona info de mercado às notas do lead e ao payload Bitrix
