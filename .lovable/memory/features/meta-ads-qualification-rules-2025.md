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
6. **Ahorros para impuestos** (actualizado): el lead se considera CUALIFICADO si:
   - (a) responde afirmativamente en `tiene_ahorros_impuestos` (acepta: "si", "sí", "yes", "true", "1", "y", "s"), **O**
   - (b) declara un `monto_ahorros` numérico > 0.
   - Solo se rechaza si AMBOS están vacíos / negativos. Razón: "Sin ahorros declarados para cubrir impuestos de compraventa".
   - Ya NO se aplica el piso fijo de 5.000 € en el webhook. La regla dinámica (valor inmueble × % ITP CCAA) sigue aplicándose en el simulador hipotecario (`src/lib/simuladorUtils.ts`).
