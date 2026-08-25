---
name: Meta Ads qualification rules 2025
description: Critérios de qualificação automática (qualificarLead) no webhook Meta Ads
type: feature
---

Reglas de cualificación automática aplicadas en `supabase/functions/meta-lead-webhook/index.ts` (función `qualificarLead`):

1. Antigüedad laboral: rechazo si < 1 año o contrato precario (fijo_discontinuo, temporal, obra y servicio, prácticas, formación, interinidad, eventual).
2. Tiene NIE/DNI: rechazo si negativo.
3. No en fichero de morosidad (ASNEF/RAI/impagos).
4. **Edad ≤ 60** (rechazo si >60). Actualizado 2026-06-25.
5. **Ingresos mínimos ≥ 1.200 €/mes** (después de normalizar rangos Meta). Actualizado 2026-06-25.
6. Deudas: rechazo si la cuota mensual de deudas ≥ 30% de los ingresos.
7. **Ahorros para impuestos** (Actualizado 2026-07-02): el lead se considera CUALIFICADO si:
   - (a) responde afirmativamente en `tiene_ahorros_impuestos` con **`si`, `sí`, `yes` o derivados claros**, **O**
   - (b) declara un `monto_ahorros >= 10.000€`.
   - Se rechaza si NO cumple ninguna de las dos. Razón: "Ahorros insuficientes (mínimo 10000€ o respuesta afirmativa "sí")".
   - El valor `montoAhorros` validado aquí es el MISMO que entra en `calcularPrecioMaximoInmuebleMeta` (P1) para el cálculo del Precio Máximo de Inmueble. Logs explícitos en el edge function permiten rastrear la coherencia.
   - La regla dinámica completa (valor inmueble × % ITP CCAA) sigue aplicándose en el simulador hipotecario (`src/lib/simuladorUtils.ts`) cuando el cliente introduce el precio real del inmueble.

**Parser robusto `parseAhorros` (2025-04)**: el campo `monto_ahorros` se parsea con un parser dedicado que entiende formatos abiertos del Meta Ads:
   - Numérico puro: `5000`, `5000.50`
   - Con símbolo monetario o espacios: `5000€`, `5 000`, `7 K€`
   - Sufijos `k`/`K`: `5k`, `7K`, `10.5k`, `5,5k`
   - Sufijos `mil`/`MIL`: `10mil`, `10 mil`, `4 mil`, `7,5 mil`, `6 mil por ahora`
   - Separador de miles con punto/coma: `5.000`, `10,000`, `1.500.000`
   - Decimal con coma: `5,5` → 5.5 (cuando NO hay patrón de miles)
   - Respuestas numéricas cortas entre 5 y 100 se interpretan como miles: `5` → 5000, `6` → 6000, `10` → 10000, `100` → 100000.
   - Heurística: si el patrón es `^\d{1,3}([.,]\d{3})+$` se trata como separador de miles; si no, la coma se interpreta como decimal.
   - Resultado siempre en euros (número), `Math.max(0, ...)`. Nunca negativo.
   - La cualificación usa el mayor valor parseado entre `monto_ahorros` y `tiene_ahorros_impuestos`, porque Meta puede enviar cantidades en cualquiera de los dos campos.
   - Si la respuesta textual de ahorros es afirmativa, el payload enviado a Bitrix normaliza `meta_tiene_ahorros` como **`sí`**.
