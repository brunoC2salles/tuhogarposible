---
name: Precio mínimo de cualificación por área
description: Regla aislada que descualifica leads cuyo máximo financiable no llega al precio mínimo del distrito/municipio/CCAA
type: feature
---

Implementado 2026-08-25. Regla **adicional e isolada** (não altera as demais regras de cualificação).

Ficheiros:
- `supabase/functions/_shared/zonaPreciosData.ts` — dataset autogerado: 8.124 municípios (Catastro: `precio_medio`, `superficie_media`, `cod_ccaa`), **mediana** por CCAA pré-calculada e distritos das 10 maiores cidades (idealista: `precio_m2`, `confianca`).
- `supabase/functions/_shared/precioMinimoZona.ts` — resolvedor de texto livre → `cod_muni` (sem acentos, variantes `València`/`Valencia`, `Alicante/Alacant`) + cálculo e avaliação.
- Integrado em `meta-lead-webhook` (também cobre Tally, que entra por esse webhook) e exibido no CRM (`LeadDetailsModal`, cartão "Precio mínimo del área").

Cálculo:
1. CASO B (10 maiores cidades, match por `cod_muni`): calcula-se a referência de distrito (informado, ou o mais barato da cidade se não informado) **e** a referência de município/CCAA, e usa-se **sempre a mais barata** das duas como precio_minimo. `confianca='aproximada'` NÃO é motivo de fallback.
2. CASO A: `precio_medio` do município; se nulo → mediana da mesma CCAA.
3. `superficie_ref` = metragem informada pelo lead; senão **65 m² (mediana de mercado)** — constante `SUPERFICIE_CIUDAD_REF` (2026-08-31). Antes usava a média catastral da cidade (89–115 m²), que inflava o precio mínimo.
4. **Margem única ×0,80** sobre a base.
5. `max_financiable` do lead = `precio_max_recomendado` (MIN(P1,P2)). Se `< precio_minimo` → lead vai para `descualificados` com motivo "Presupuesto por debajo del mínimo de la zona" (não vai a Bitrix/WhatsApp).
6. Sem dado de município nem de CCAA → `zona_precio_sin_dato: true`, lead segue o fluxo normal, nunca fila manual.

Campos gravados em `simulador_hipotecario_data`: `zona_precio_minimo`, `zona_precio_base`, `zona_precio_metodo`, `zona_precio_sin_dato`, `zona_cod_muni`, `zona_municipio`, `zona_ccaa`, `zona_distrito`, `zona_precio_m2`, `zona_superficie_ref`, `zona_confianza`, `zona_cualificado`.
