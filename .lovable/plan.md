

# Plan: Fix Mortgage Approval in Combined Simulator Context

## Problem Analysis

**Issue 1 — Mortgage shows "not approved" incorrectly:**
The mortgage approval logic (line 565 of `simuladorUtils.ts`) requires ALL criteria including `capitalPropioSuficiente` (savings >= capital needed). In the user's case: savings = 0€, capital needed = 18,000€, so `capitalPropioSuficiente = false` → mortgage marked as "NO APROBABLE".

However, in the **combined simulator**, the personal credit exists precisely to cover this gap. When the personal credit is qualified and covers the gap, the mortgage should be considered approvable.

**Issue 2 — Total paid (150,107€) seems high:**
The math is actually correct:
- Mortgage: 90,000€ at 2.5% for 30 years = 355.61€/month × 360 = 128,020€
- Personal: 18,000€ at 6% for 7 years = 262.95€/month × 84 = 22,088€
- Total: ~150,107€ (42,107€ in total interest over 30 years)

This is standard for a 30-year mortgage. However, the "Total Pagado" box should clarify that this includes interest, and show a breakdown: principal vs interest. This way the user understands the 50k extra is accumulated interest over 30 years, not an error.

## Changes

### 1. `ResultadosCombinados.tsx` — Adjusted mortgage approval in combined context

In the mortgage section (around line 176-189), replace the simple `aprobable` check with combined logic:

```
const personalCubreGap = resultadosPersonal.cualificado && 
  resultadosPersonal.montoFinanciar <= resultadosPersonal.montoMaximoCredito;

const hipotecaAprobableConPersonal = !resultadosHipoteca.aprobable && 
  !resultadosHipoteca.capitalPropioSuficiente && personalCubreGap &&
  (all other mortgage criteria pass);
```

- If `hipotecaAprobableConPersonal`: show green badge "HIPOTECA APROBABLE (con crédito personal)"
- Change the "Capital Propio Insuficiente" warning to an informational note: "El crédito personal cubre los X€ restantes"
- Hide `razonNoAprobado` when the only reason was insufficient capital and personal credit covers it

To check "all other mortgage criteria pass" without modifying `simuladorUtils.ts`, we can verify: `cuotaMensual <= hipotecaMaximaMensual` AND `hipotecaMaximaMensual >= 350` AND `montoFinanciable >= 70000` AND `montoFinanciable <= montoMaximoFinanciable`.

### 2. `ResultadosCombinados.tsx` — Clarify "Total Pagado" breakdown

In the cost summary section (around line 282-301), add below the "Total Pagado":
- "Capital financiado: X€" (mortgage principal + personal principal)
- "Intereses totales: Y€" (total paid - total principal)

This makes it clear that the ~42k difference is interest, not an error.

### No changes to:
- `simuladorUtils.ts` — the standalone mortgage logic remains unchanged
- `SimuladoresIndex.tsx` — calculation flow unchanged
- Backend webhooks — they already handle this correctly

