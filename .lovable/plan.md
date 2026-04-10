

# Plan: Fix Approval Logic, Clean Layout, Remove Resumen de Pagos

## Problem Analysis

The screenshot shows "HIPOTECA NO APROBABLE" for a client with 150k€ property, 3,000€/mes income, cuota 533€ — well within capacity. The reason: **`capitalPropioSuficiente`** (savings ≥ capital propio) is blocking approval. Since we now treat the savings gap as "valor a completar con otros recursos" (covered by savings + personal credit), this should NOT block mortgage approval.

## Changes

### 1. Fix approval logic (`src/lib/simuladorUtils.ts`)

**Line 588**: Remove `capitalPropioSuficiente` from the `aprobable` formula. The mortgage is approved based on income capacity only:
- `aprobable = aprobablePorIngresos && capacidadMinimaSuficiente && cumpleMinimoFinanciable && montoNoSuperaMaximo`

**Lines 600-601**: Remove the capital propio reason from `razonNoAprobado`. The capital gap is already shown as an informational warning, not a blocker.

### 2. Remove "Resumen de Pagos" section (`ResultadosCombinados.tsx`)

Delete lines 188-230 (the entire "Resumen de Pagos — Hipoteca" section). The cuota, total costs, and interest info are already visible in the main section above.

### 3. Improve layout clarity (`ResultadosCombinados.tsx`)

- Move the approval badge + capital gap warning to a clear final verdict area after "Capacidad Máxima de Compra"
- Integrate the total cost breakdown (Capital Financiado, Total Intereses, Total a Pagar) into the main "Crédito Hipotecario" section as a compact summary row — so removing Resumen de Pagos doesn't lose that data

### 4. Update PDF (`src/lib/pdfGenerator.ts`)

Remove the "Resumen de Pagos" section from the PDF to match the UI. Keep total cost data inline.

## Files modified
- `src/lib/simuladorUtils.ts` — approval logic fix
- `src/components/simuladores/ResultadosCombinados.tsx` — remove Resumen de Pagos, improve layout
- `src/lib/pdfGenerator.ts` — align PDF with UI changes

