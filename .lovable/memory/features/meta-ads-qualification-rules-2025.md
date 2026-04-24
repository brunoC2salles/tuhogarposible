---
name: Meta Ads qualification rules 2025
description: Critérios de qualificação automática (qualificarLead) no webhook Meta Ads
type: feature
---

Reglas de cualificación automática aplicadas en `supabase/functions/meta-lead-webhook/index.ts` (función `qualificarLead`):

1. Edad: rechazo si < 25 o > 70.
2. Tipo de contrato: rechazo si es "temporal" / "becario" / "sin contrato".
3. Ingresos mínimos: rechazo si < 1.200 €/mes (después de normalizar rangos).
4. Antigüedad laboral: rechazo si < 6 meses.
5. Deudas: rechazo si la cuota mensual de deudas ≥ 30% de los ingresos.
6. **Ahorros para impuestos** (endurecido 2025-04): el lead se considera CUALIFICADO si:
   - (a) responde afirmativamente en `tiene_ahorros_impuestos` con **`si`, `sí` o `yes`** (lista reducida — ya NO acepta `true`, `1`, `y`, `s`), **O**
   - (b) declara un `monto_ahorros >= 5.000€`.
   - Se rechaza si NO cumple ninguna de las dos. Razón: "Ahorros insuficientes (mínimo 5000€ o respuesta afirmativa "sí")".
   - El valor `montoAhorros` validado aquí es el MISMO que entra en `calcularPrecioMaximoInmuebleMeta` (P1) para el cálculo del Precio Máximo de Inmueble. Logs explícitos en el edge function permiten rastrear la coherencia.
   - La regla dinámica completa (valor inmueble × % ITP CCAA) sigue aplicándose en el simulador hipotecario (`src/lib/simuladorUtils.ts`) cuando el cliente introduce el precio real del inmueble.
