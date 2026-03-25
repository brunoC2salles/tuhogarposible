

# Plan: Factor Personal Credit into Max Property Price

## What changes

The "Precio Máximo de Vivienda" currently only considers the mortgage ceiling: `montoMaxFinanciable / (porcentaje/100)`. This ignores that the lead can also use personal credit to cover the down payment and taxes, potentially reaching a higher property price.

### New calculation logic

Two constraints determine the real max property price:

1. **Mortgage constraint**: `P <= montoMaxFinanciable / (porcentaje/100)` (unchanged)
2. **Capital constraint**: `P*(1 - porcentaje/100) + P*tasaITP + 2000 <= ahorros + montoMaximoCredito`
   → `P <= (ahorros + montoMaximoCredito - 2000) / (1 - porcentaje/100 + tasaITP)`

The effective max = `min(constraint1, constraint2)`. We need the ITP rate for the selected region (already available via `calcularGastosHipoteca` logic — we'll extract the rate directly).

### Changes in `ResultadosCombinados.tsx`
- Import `calcularGastosHipoteca` or extract ITP rate logic
- Calculate `precioMaxConPersonal` using both constraints
- Display the enhanced max price in the green box, with a note showing that personal credit is factored in
- Show breakdown: "Hipoteca máx: X€ + Crédito personal máx: Y€ + Ahorros: Z€"

### Changes in `pdfGenerator.ts`
- Add same calculation to the combined PDF
- Update the "Precio máximo de vivienda" row to use the new value
- Add a note indicating personal credit is included

## Files modified
- `src/components/simuladores/ResultadosCombinados.tsx`
- `src/lib/pdfGenerator.ts`

## What does NOT change
- `simuladorUtils.ts` calculation logic
- Approval rules
- Personal credit section
- Plan de Pagos section

