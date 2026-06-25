## 1) Criterios actuales de cualificación (Meta Ads webhook)

Orden exacto en `qualificarLead` (`supabase/functions/meta-lead-webhook/index.ts`):

1. **Antigüedad laboral ≥ 1 año** — rechaza si <1 año o contrato precario (`fijo_discontinuo`, `temporal`, `obra y servicio`, `prácticas`, `formación`, `interinidad`, `eventual`).
2. **Tiene NIE/DNI** — rechaza si negativo.
3. **No está en fichero de morosidad** (ASNEF/RAI/impagos).
4. **Edad < 55** — rechaza si ≥55.
5. **Ingresos ≥ 1.300 €/mes** (tras normalizar rangos Meta).
6. **Deuda mensual < 30% de ingresos.**
7. **Ahorros**: respuesta afirmativa ("sí/si/yes"…) **o** `monto_ahorros ≥ 5.000 €`.

## 2) Estadísticas reales 20–24/06/2026 (meta_ads)

Volumen / cualificados:

| Día | Total | Cualificados | Descualificados | % cualif. |
|---|---:|---:|---:|---:|
| 20/06 | 54 | 3 | 51 | 5,6% |
| 21/06 | 63 | 7 | 56 | 11,1% |
| 22/06 | 55 | 7 | 48 | 12,7% |
| 23/06 | 63 | 1 | 62 | 1,6% |
| 24/06 | 15 | 0 | 15 | 0,0% (parcial) |

Motivos de descualificación (5 días, 232 leads):

| Motivo | Total | % |
|---|---:|---:|
| Antigüedad insuficiente | 116 | 50,0% |
| Ahorros insuficientes | 54 | 23,3% |
| Edad ≥55 | 28 | 12,1% |
| Morosidad | 17 | 7,3% |
| Ingresos <1.300€ | 14 | 6,0% |
| Deuda ≥30% | 3 | 1,3% |

Detalle de "antigüedad insuficiente":
- 68 leads (58%) declararon literal **<1 año**.
- 45 leads (38%) marcaron **fijo_discontinuo**.
- 3 leads (3%) **temporal**.

**Observaciones clave** (antes de tocar nada):
- 21 y 22/06 están dentro de tu rango histórico (8–12%). El descenso real está en **23/06 (1,6%)** y **24/06 (parcial 0%, sólo 15 leads hasta ahora)**.
- Las reglas no se modificaron entre el 22 y el 23. Lo que cambió es el **mix de leads entrantes**: 38% de descualificados por `fijo_discontinuo` (que el algoritmo trata como precario) y un fuerte volumen sin antigüedad mínima. Esto apunta a un cambio en **público/segmentación de la campaña Meta**, no a un bug del webhook.
- Conclusión: **no hay evidencia de bug en la cualificación**. Antes de reprocesar y reenviar a Bitrix conviene confirmarlo con un muestreo manual (ver paso 4).

## 3) Fórmula P1 actual (Precio Máximo Inmueble) y ajuste propuesto

Código actual (`calcularPrecioMaximoInmuebleMeta`, líneas 975–999):

```ts
const ahorros  = max(ahorros, 0);
const tasaITP  = getITPPorCCAA(comunidad);   // 4%–10%
const cpMax    = (15.000 + ahorros) / 2;     // <-- /2 sin base económica clara
const P1       = round(cpMax / tasaITP);

const pct      = pct_financiacion / 100;     // 0,90
const P2       = round(monto_max_financiable / pct);

precio_recomendado = MIN(P1, P2);
```

Problemas:
- El `/2` no tiene justificación económica. Hace que P1 escale lento con los ahorros.
- `monto_max_financiable` está topado a **180.000 €** (1 titular). Como P2 = tope/0,9, P2 se "congela" en 200.000 € para casi todos los ingresos altos → MIN(P1, P2) deja de reaccionar a ingresos.

Ajustes a aplicar (conserva los 15 k de crédito personal, como pediste):

a) **P1 = (15.000 + ahorros) / (tasaITP + 0,10)** — entrada 10% + ITP por CCAA. Mantiene los 15k de CP y refleja qué precio cubren ahorros+CP entre entrada e impuestos. Reemplaza el `/2` arbitrario.

b) **Tope absoluto del webhook a 210.000 €** (antes 180.000 €) en `monto_max_financiable`. Alineado con la regla de 2+ titulares del simulador.

Resultado esperado: para un mismo perfil, más ahorros y/o más ingresos siempre producen precio recomendado ≥, eliminando las inconsistencias que detectaste.

## 4) Reprocesamiento 20–24/06 — condicionado

Antes de tocar el bitrix:

1. **Validación manual de un muestreo (10–15 leads)** del 23 y 24/06 marcados como `Antigüedad insuficiente / Ahorros / Edad`. Te dejo la lista (id, teléfono, motivo, valores brutos) en un export para que confirmes con WhatsApp/llamada que efectivamente no cualificaban. Sin esto, el "0 cualificados" puede ser real (campaña atrayendo público fuera de target).
2. **Sólo si la validación muestra falsos negativos**, se ejecuta un job one-shot que:
   - Relee leads `descualificados` del 20–24/06 (source `meta_ads`).
   - Recalcula cualificación con las reglas vigentes (sin cambios).
   - Recalcula `precio_max_recomendado` con la nueva fórmula P1 + tope 210k.
   - Para los que ahora cualifican: mueve a `nuevo_lead`, reasigna agente (round-robin existente) y dispara `make-webhook-proxy` con el payload Bitrix.
   - Para los que siguen descualificados: sólo actualiza el `precio_max_recomendado` en notas (no se reenvía).
3. Job idempotente, con `dry-run` primero (lista de afectados) → confirmación tuya → ejecución real.

## Archivos a modificar (sólo cuando aprueres)

- `supabase/functions/meta-lead-webhook/index.ts` → fórmula P1, tope 210k.
- `supabase/functions/_shared/bitrixPayload.ts` → si el tope también vive aquí, alinearlo.
- Nueva edge function `supabase/functions/reprocess-meta-leads/index.ts` → job one-shot, modo `dry-run` y `apply`.
- `.lovable/memory/features/meta-ads-qualification-rules-2025.md` y `.lovable/memory/features/mortgage-simulator-rules-2025.md` → actualizar para reflejar fórmula P1 nueva y tope 210k del webhook.

## Lo que NO se toca

- Reglas de cualificación (siguen como están; no se ablandan sin evidencia).
- `simuladorUtils.ts` del simulador web (regla dinámica de ahorros por CCAA intacta).
- Parsers (`parseAntiguedad`, `parseIngresos`, `parseAhorros`, `parseDeudas`, `parseEdad`).
- UI del CRM, kanban, autenticación, otros webhooks.

## Resumen para tu OK

1. ¿Confirmas la fórmula P1 = (15.000 + ahorros) / (tasaITP + 0,10)? Si prefieres mantener el `/2` actual, lo dejamos.
2. ¿Genero primero el export de muestreo del 23–24/06 para validar manualmente, antes de cualquier reproceso?
