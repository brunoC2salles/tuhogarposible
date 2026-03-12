

# Plan: Add Personal Credit Cuota as Informational Warning in Combined Results

## What changes

### `ResultadosCombinados.tsx`
Add an informational alert between the two result sections showing the combined monthly financial commitment:

- After the mortgage section, add a highlighted box:
  - "**Compromiso financiero total:** Cuota hipotecaria (X€/mes) + Cuota crédito personal (Y€/mes) = **Z€/mes**"
  - Show what percentage of net income this represents
  - If total > 50% of income, show amber warning: "Atención: el compromiso total supera el 50% de los ingresos netos"
  - If total > 60%, show red warning

### No changes to:
- `simuladorUtils.ts` — approval logic stays as-is (personal cuota does NOT affect mortgage approval)
- `SimuladoresIndex.tsx` — calculation flow unchanged
- Schema, PDF generators, CRM

## Technical detail

In `ResultadosCombinados.tsx`, after the mortgage section and before the RGPD section, insert:

```tsx
const compromisoTotal = resultadosPersonal.cuotaMensual + resultadosHipoteca.cuotaMensual;
const porcentajeIngresos = (compromisoTotal / datos.ingresosMensuales) * 100;
```

Display a card with the total, percentage, and conditional warning color (green ≤50%, amber 50-60%, red >60%).

