

# Plan: Simplify Results — Remove Personal Credit Cuotas

## Summary

Remove all personal credit cuota/payment displays from both the UI and PDF. The personal credit section becomes informational only (how much extra capital is needed, with a note that it requires document submission). The "Capacidad Máxima" section shows only mortgage maximum with its cuota.

## Changes in `ResultadosCombinados.tsx`

### Section 1 — "Crédito Personal de Acuerdo con Documentación" (lines 110-165)

**Remove:** The 3-column grid (lines 134-148) containing Cuota Mensual, Crédito Máximo, and Total a Pagar cards.

**Keep:** The 4 info cards (Capital Propio Necesario, Ahorros, Plazo, Tasa) and the qualification badge.

**Add:** A text note saying the personal credit amount will be confirmed upon document submission (e.g., "El crédito personal será otorgado mediante la subida de documentación correspondiente").

**Rename "Cuota Mensual" references** in the disqualification message to just reference the monto, not the cuota.

### Section "Capacidad Máxima de Compra" (lines 206-265)

**Row 1 (3 cards):** Remove the "Crédito Personal Máximo" card (lines 222-229). Keep Hipoteca Máxima (with cuota) and Ahorros. Grid becomes 2 columns.

**Row 2 (summary):** Remove "Cuota Total Máxima" card (lines 249-255) since there's no combined cuota anymore. Keep Precio Máximo de Vivienda and Precio Medio de Mercado. Grid becomes 2 columns.

**Note:** The Precio Máximo de Vivienda calculation still internally uses personal credit in its formula — only the display of personal credit cuota is removed.

## Changes in `pdfGenerator.ts`

### Personal credit table (lines 494-508)
Remove the `['Cuota mensual', ...]` row (line 500). Keep the rest (máximo crédito, cantidad solicitada, total intereses, monto total).

### Hipotecario section (lines 552-587)
Remove the "Cuota Total Máxima" references. The footnote on line 587 stays as-is since the price calculation still uses personal credit internally.

## Files modified
- `src/components/simuladores/ResultadosCombinados.tsx`
- `src/lib/pdfGenerator.ts`

## What does NOT change
- All calculation logic in `simuladorUtils.ts`
- Plan de Pagos section (Section 3)
- Approval/qualification rules
- Precio Máximo de Vivienda formula (still uses personal credit internally)

