

# Plan: Adjustments to Credit Simulators Business Rules

## Summary

3 changes to `src/lib/simuladorUtils.ts` only. No UI changes, no new files, no schema changes.

---

## Changes in `simuladorUtils.ts`

### 1. Personal Credit — Qualification rule change

**Current:** `cualificado = (ingresos × 35%) - deudas >= 350`

**New:** `cualificado = cuotaMensual <= (ingresos - deudas) × 25%`

Qualification now checks if the monthly installment fits within 25% of net income (income minus debts). The `montoMaximoCredito` calculation also changes to use the 25% rule instead of 35%.

### 2. Mortgage — Minimum 70k€ for monto financiable

If `montoFinanciable < 70,000€`, mark as not approved with a descriptive reason. This does NOT apply to personal credit.

### 3. Mortgage — Cap montoMaximoFinanciable by number of holders

After calculating `montoMaximoFinanciable` (the income-based maximum), cap it:
- 1 holder → max 180,000€
- 2+ holders → max 210,000€

---

## What does NOT change

- DNI/NIE financing percentages (90%/80%) — already correct
- UI components, edge functions, schema — untouched
- Mortgage 35% capacity rule and 350€ minimum — stays as is
- No minimum amount for personal credit

## Files to modify

| File | Changes |
|---|---|
| `src/lib/simuladorUtils.ts` | 3 edits: personal credit 25% rule, mortgage 70k min, mortgage 180k/210k cap |

