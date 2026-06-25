## Cambios en reglas de cualificación (`meta-lead-webhook/index.ts` → `qualificarLead`)


| Regla            | Antes           | Después                                     |
| ---------------- | --------------- | ------------------------------------------- |
| Edad             | rechaza si ≥55  | rechaza si **>60** (acepta 18–60 inclusive) |
| Ingresos mínimos | <1.300 €/mes    | **<1.200 €/mes**                            |
| Ahorros mínimos  | "sí" o ≥5.000 € | "sí" o **≥1.000 €**                         |


Resto de reglas **sin cambios**: antigüedad ≥1 año (con lista de contratos precarios), NIE/DNI, morosidad, deuda <30% ingresos.

El tiempo de financiación, para calcular la hipoteca, deve ser siempre la diferencia de (75 - edad)

Actualizar `.lovable/memory/features/meta-ads-qualification-rules-2025.md` para reflejar los nuevos umbrales.

## Cálculo precio máximo de vivienda (verificación)

Mantener la fórmula ya aplicada el 25/06:

- **P1 (ahorros + CP)** = `(15.000 + ahorros) / (ITP_CCAA + 0,10)`
- **P2 (ingresos)** = `monto_max_financiable / 0,90`, con `CAP_MONTO_1_TITULAR = 210.000€`
- **Precio recomendado** = `MIN(P1, P2)`

Verificación a ejecutar antes del reprocesamiento:

- Test interno con 5 perfiles sintéticos (ahorros bajos/altos × ingresos bajos/altos × CCAA con ITP min/max) y comprobar monotonía: a mayor ahorros → P1 ≥; a mayor ingresos → P2 ≥; recomendado nunca decrece al mejorar un input.
- Si algún caso rompe la monotonía, ajustar y volver a verificar antes de reprocesar.

## Reprocesamiento últimos 5 días (20–24/06/2026)

Nueva edge function `**reprocess-meta-leads**` (one-shot, dos modos):

1. `**mode=dry-run**` (default): lee leads con `stage='descualificado'` y `source='meta_ads'` creados entre 2026-06-20 y 2026-06-24, recalcula `qualificarLead` con los nuevos umbrales y `calcularPrecioMaximoInmuebleMeta`, y devuelve JSON con: total, ahora cualifican, siguen descualificados, desglose por nuevo motivo, lista (id, teléfono, motivo previo, edad, ingresos, ahorros, antigüedad, comunidad, precio recomendado nuevo).
2. `**mode=apply**` (requiere confirmación tuya tras revisar el dry-run): para los que ahora cualifican:
  - Mueve `stage` a `nuevo_lead`.
  - Asigna agente vía round-robin existente (`get-next-agent`).
  - Actualiza `precio_max_recomendado` y campos relacionados.
  - Llama `make-webhook-proxy` con el payload Bitrix (mismo formato que el webhook normal).
  - Registra en `webhook_logs`.
   Para los que siguen descualificados: sólo actualiza el `precio_max_recomendado` (no se reenvía nada a Bitrix).

Idempotencia: marca cada lead reprocesado con un flag en `webhook_logs` (`type='reprocess_2026-06-20_24'`) para no reenviar dos veces si se vuelve a llamar.

Seguridad: function con `verify_jwt = false` pero protegida por un header `X-Reprocess-Token` comparado contra un secret nuevo `REPROCESS_TOKEN` (te lo pediré al pasar a build).

## Archivos a tocar

- `supabase/functions/meta-lead-webhook/index.ts` — umbrales edad/ingresos/ahorros en `qualificarLead`.
- `supabase/functions/reprocess-meta-leads/index.ts` — **nuevo**, modo dry-run / apply.
- `.lovable/memory/features/meta-ads-qualification-rules-2025.md` — documentar nuevos umbrales.

## Lo que NO se toca

- Fórmula P1/P2 ni cap 210k (ya ajustados el 25/06, sólo se verifican).
- `simuladorUtils.ts` y reglas del simulador web.
- Parsers (`parseEdad`, `parseIngresos`, `parseAhorros`, `parseAntiguedad`, `parseDeudas`).
- Resto de reglas de cualificación (antigüedad, NIE, morosidad, deuda).
- UI, kanban, otros webhooks.

## Flujo de ejecución (tras aprobar este plan)

1. Aplico cambios de umbrales + creo `reprocess-meta-leads` + añado secret `REPROCESS_TOKEN`.
2. Corro la **verificación de monotonía** del precio máximo y te muestro la tabla.
3. Corro `**dry-run**` sobre 20–24/06 y te enseño cuántos pasan a cualificados, con desglose.
4. **Sólo con tu OK explícito** corro `apply` y se reenvía a Bitrix.