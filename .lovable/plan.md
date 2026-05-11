## Objetivo

No payload enviado ao Bitrix (Make.com), igualar **`sim_hipoteca_monto_financiable`** ao **`sim_hipoteca_valor_max_inmueble`** (= precio máximo de vivienda calculado a partir dos ahorros / ingressos).

Hoje:
- `sim_hipoteca_monto_financiable` → ~180.000 € (cap absoluto por titular)
- `sim_hipoteca_valor_max_inmueble` → valor real recomendado (ex.: 95.000 €)

Depois:
- Ambos os campos = precio máximo de vivienda (ex.: 95.000 € e 95.000 €)

## Alteração

**Arquivo único:** `supabase/functions/_shared/bitrixPayload.ts`

1. Calcular primeiro `hipotecaValorMaxInmueble` (precio máximo recomendado).
2. Sobrescrever `hipotecaMontoFinanciable` para que seja igual a `hipotecaValorMaxInmueble` (com fallback ao valor antigo apenas se o precio max for 0/inválido).
3. Os dois campos do payload (`sim_hipoteca_monto_financiable` e `sim_hipoteca_valor_max_inmueble`) recebem o mesmo número.
4. `sim_hipoteca_precio_max_inmueble` (extra) também já bate com esse valor — sem mudança extra.

Log adicionado para confirmar que ambos saem iguais.

## Fora de escopo

- Lógica interna do simulador (`src/lib/simuladorUtils.ts`) e do `meta-lead-webhook` permanecem intactas — só muda o que é **enviado** ao Bitrix.
- `sim_hipoteca_cuota_real` continua sendo a cuota REAL calculada (não recalcular a partir do novo monto).
- Nenhuma migração de banco; aplica-se a todos os envios futuros (Meta Ads, manual, teste).