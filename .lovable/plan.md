

# Plan: Simplify Personal Credit Section

## Summary

Strip the personal credit section down to only show the extra amount needed and the informational note. Remove the 4 info cards (Capital Propio Necesario, Ahorros, Plazo, Tasa).

## Change in `ResultadosCombinados.tsx`

**Lines 114-157** — Replace the entire `<div className="p-4 space-y-4">` content with just:

1. The "Monto extra a financiar" highlight box (already exists, lines 134-141)
2. The informational note (already exists)
3. The qualification badge (keep as-is, lines 143-156)

**Remove:** The 4-card grid (lines 115