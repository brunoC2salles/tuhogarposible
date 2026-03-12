

# Plan: Show Payment Timeline with Two Phases in Combined Results

## Current State
The flow is already correct: mortgage calculates first, personal credit finances the gap (`capitalPropioNecesario - ahorrosDisponibles`), and total monthly commitment is shown. What's missing is a clear **timeline view** showing that payments decrease after the personal credit ends.

## Changes — `ResultadosCombinados.tsx` only

### Add a "Plan de Pagos" section in the Compromiso Financiero Total area:

**Phase 1** — From month 1 to `plazoMeses` (personal credit duration):
- Monthly payment = cuota hipotecaria + cuota crédito personal
- Example: "Primeros 7 años: 1.200€/mes (hipoteca 800€ + personal 400€)"

**Phase 2** — From end of personal credit to end of mortgage:
- Monthly payment = cuota hipotecaria only
- Example: "Años 8-30: 800€/mes (solo hipoteca)"
- Highlight the savings: "Ahorro mensual tras liquidar crédito personal: 400€/mes"

**Summary box:**
- Total paid over full mortgage life = (Phase 1 months × Phase 1 cuota) + (Phase 2 months × Phase 2 cuota)
- This gives the true total cost of acquiring the property

### Visual: simple two-row timeline with colored bars showing the payment reduction

No changes to `simuladorUtils.ts`, `SimuladoresIndex.tsx`, or any calculation logic. Pure UI/display enhancement.

