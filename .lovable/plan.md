

# Plan: Show Monthly Installments for Maximum Amounts

## What

In the green highlighted box of `ResultadosCombinados.tsx`, add the monthly installment (cuota) that corresponds to each maximum amount:
- **Cuota máx. hipoteca**: the monthly payment if the lead finances `montoMaximoFinanciable` (this is already `hipotecaMaximaMensual` from `resultadosHipoteca`)
- **Cuota máx. crédito personal**: the monthly payment if the lead takes `montoMaximoCredito` (recalculate using French amortization with the personal loan rate/term)
- **Cuota total máxima**: sum of both

## Changes

### `ResultadosCombinados.tsx`
1. **Calculate max personal credit cuota**: Using French amortization formula with `resultadosPersonal.montoMaximoCredito`, `datos.tasaAnual`, and `datos.plazoMeses`
2. **Get max mortgage cuota**: Already available as `resultadosHipoteca.hipotecaMaximaMensual` (35% of net income — this is the cuota ceiling that determines `montoMaximoFinanciable`)
3. **Update the green box** to show under each max amount its corresponding monthly installment, plus the combined total cuota

### Layout update in the green box
The breakdown line at the bottom will be enhanced to show cuotas:
```
Hipoteca máx: 150.000€ (cuota: 525€/mes)
+ Crédito personal máx: 24.000€ (cuota: 400€/mes)  
+ Ahorros: 10.000€
Cuota total máxima: 925€/mes
```

## Technical detail
- Personal max cuota formula: `P * [r*(1+r)^n] / [(1+r)^n - 1]` where P = `montoMaximoCredito`, r = `tasaAnual/12/100`, n = `plazoMeses`
- Mortgage max cuota = `resultadosHipoteca.hipotecaMaximaMensual`

## Files modified
- `src/components/simuladores/ResultadosCombinados.tsx` only

