

# Plan: Fix Personal Credit Calculation + Update UI Texts

## Problem Identified

In the unified simulator (`SimuladoresIndex.tsx`), the personal credit calculates the monthly installment on the full property value (150,000€), resulting in ~2,191€/month. The user expects the personal credit to finance the **capital propio necesario** from the mortgage (down payment + taxes = ~26,000€), which would give ~381€/month.

Additionally, UI texts still reference "35% de los ingresos" when the rule was already changed to 25%.

## Changes

### 1. `src/pages/simuladores/SimuladoresIndex.tsx` — Fix personal credit base amount

In the `onSubmit` function (line ~125-148), reverse the calculation order:
- Calculate **mortgage first** to get `capitalPropioNecesario`
- Then calculate personal credit using `capitalPropioNecesario` as the amount to finance instead of `valorInmueble`

```typescript
// 1. Calculate hipoteca FIRST
const resHipoteca = calcularSimulacionHipoteca(data as any);

// 2. Calculate personal credit based on capital propio necesario
const resPersonal = calcularAmortizacionFrancesa({
  valorInmueble: resHipoteca.capitalPropioNecesario, // <-- KEY CHANGE
  entrada: data.entrada,
  plazoMeses: data.plazoMeses,
  tasaAnual: data.tasaAnual,
  ingresos: data.ingresosMensuales,
  deudas: data.deudasActuales,
});
```

This means: if the mortgage finances 90% of 150k (=135k), the client needs 15k + 11k taxes = 26k. The personal credit simulates financing that 26k.

### 2. `src/components/simuladores/ResultadosCombinados.tsx` — Fix texts and add explanation

- Line 85: Change `"35% de los ingresos"` → `"25% de (ingresos - deudas)"`
- Line 64: Change "Valor Inmueble" label → "Importe a Financiar" (since it now shows capitalPropioNecesario, not full property value)
- Add explanation when not qualified showing how much the cuota exceeds the 25% capacity

### 3. `src/components/simuladores/ResultadosSimulacion.tsx` — Fix standalone text

- Line 90: Change `"Basado en el 35% de tus ingresos"` → `"25% de (ingresos - deudas)"`

### 4. `src/lib/pdfGenerator.ts` — Update PDF texts

- Update any "35%" references related to personal credit maximum to "25%"

### 5. `src/components/simuladores/ResultadosSimulacao.tsx` — Review texts

- Line 122-123: The `35` threshold in the percentage badge should use `25` for personal credit consistency

---

## What does NOT change

- `src/lib/simuladorUtils.ts` — The calculation logic is already correct (uses 25%)
- Standalone personal credit page (`SimuladorCreditoPersonal.tsx`) — Keeps using user-input `valorInmueble` (not linked to mortgage)
- Mortgage calculation logic — Untouched
- Standalone mortgage page — Untouched
- The two input fields (valorInmueble and precioVivienda) remain separate as requested

## Files to modify

| File | Changes |
|---|---|
| `src/pages/simuladores/SimuladoresIndex.tsx` | Reorder calculation: hipoteca first, then personal credit using capitalPropioNecesario |
| `src/components/simuladores/ResultadosCombinados.tsx` | Fix "35%" → "25%", update label, add non-qualified explanation |
| `src/components/simuladores/ResultadosSimulacion.tsx` | Fix "35%" → "25%" text |
| `src/components/simuladores/ResultadosSimulacao.tsx` | Fix 35 threshold → 25 |
| `src/lib/pdfGenerator.ts` | Update PDF text references |

