

# Plan: Highlight Max Financiable + Fix PDF Approval

## Problem 1: "Monto Máximo Financiable" needs prominence

Currently it's a tiny `text-xs` line under cuota mensual (line 159). Agents need to clearly see the maximum property value this lead can afford.

**Key insight:** From `montoMaximoFinanciable` we can derive the **maximum property price** the lead can target:
```
precioMaximoVivienda = montoMaximoFinanciable / (porcentajeFinanciamiento / 100)
```

This tells the agent: "this lead can buy a property up to X€".

We also already have market price data loaded via `useMarketPrices` — we can show the average property price in the selected region for context.

### Changes in `ResultadosCombinados.tsx`:
- Add a new highlighted box (green border, prominent) after the mortgage metrics grid showing:
  - **"Precio Máximo de Vivienda"**: calculated as `montoMaximoFinanciable / (porcentaje/100)`
  - **"Monto Máximo Financiable"**: the current value, displayed clearly
  - **"Precio Medio en [Comunidad]"**: from market data (if available), for comparison
- Import and use `useMarketPrices` hook to fetch average price for the selected `comunidadAutonoma`
- Keep existing cuota/ingresos boxes unchanged

### Changes in `pdfGenerator.ts` (combined PDF):
- Add a row to the mortgage table: `['Precio máximo de vivienda', formatEuro(precioMaximo)]`

## Problem 2: PDF shows "NO APROBABLE" for approved cases

**Root cause:** Line 578 in `pdfGenerator.ts` only checks `resultadosHipoteca.aprobable`, but `ResultadosCombinados.tsx` has additional logic: when personal credit covers the capital gap and other criteria pass, the mortgage is conditionally approved (`hipotecaAprobableConPersonal`).

### Fix in `pdfGenerator.ts`:
- Replicate the same combined approval logic from the UI inside `generateSimulacionCombinadaPDF`:
  ```
  personalCubreGap = resultadosPersonal.cualificado && 
    resultadosPersonal.montoFinanciar <= resultadosPersonal.montoMaximoCredito
  otrosCriterios = cuota <= hipotecaMax && hipotecaMax >= 350 && monto >= 70k && monto <= montoMax
  hipotecaAprobableConPersonal = !aprobable && !capitalSuficiente && personalCubreGap && otrosCriterios
  hipotecaAprobableFinal = aprobable || hipotecaAprobableConPersonal
  ```
- Use `hipotecaAprobableFinal` for the badge (line 578), showing "HIPOTECA APROBABLE (con crédito personal)" when applicable

## Files modified
- `src/components/simuladores/ResultadosCombinados.tsx` — add max property price box with market comparison
- `src/lib/pdfGenerator.ts` — fix approval badge logic + add max price row

## What does NOT change
- Calculation logic in `simuladorUtils.ts`
- Market prices data loading
- Personal credit section
- Plan de Pagos section

