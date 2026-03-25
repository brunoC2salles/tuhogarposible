

# Plan: Redesign Max Cuotas Section + NIE 90% Financing

## Change 1: Dedicated "Capacidad Máxima de Compra" section (UI only)

**File:** `src/components/simuladores/ResultadosCombinados.tsx`

Replace the current green box (lines 206-237) with a cleaner, dedicated section that has its own header and a structured 3-row layout:

**New layout:**
```text
┌─────────────────────────────────────────────────────┐
│  CAPACIDAD MÁXIMA DE COMPRA                         │
├─────────────────────────────────────────────────────┤
│  [Card 1]              [Card 2]          [Card 3]   │
│  Hipoteca Máx.         Créd. Personal    Ahorros    │
│  150.000€              24.000€           10.000€    │
│  Cuota: 525€/mes       Cuota: 400€/mes   —         │
├─────────────────────────────────────────────────────┤
│  Precio Máximo         Cuota Total Máx.  Precio     │
│  de Vivienda           925€/mes          Medio      │
│  280.000€                                Mercado    │
│  (hipoteca+crédito+                      250.000€   │
│   ahorros)                                          │
└─────────────────────────────────────────────────────┘
```

- Top row: 3 cards — Hipoteca Máx (with cuota), Crédito Personal Máx (with cuota), Ahorros
- Bottom row: Precio Máximo de Vivienda (large, green highlight), Cuota Total Máxima (highlighted), Precio Medio de Mercado (contextual)
- Each card has a clear label, value, and explanatory subtitle
- Remove the dense inline text breakdown at the bottom

## Change 2: NIE financing raised from 80% to 90%

**File:** `src/lib/simuladorUtils.ts`

3 locations to update:
1. **Line 355**: Change `limitaciones.push(80)` → `limitaciones.push(90)`
2. **Line 363**: Change `tipoDocumento === 'dni' ? 90 : 80` → `90` (same for both)
3. **Comment on line 317**: Update to reflect NIE = 90%

This means NIE holders with vivienda habitual + residente fiscal now get the same 90% as DNI (except funcionarios who get 100%).

## Files modified
- `src/components/simuladores/ResultadosCombinados.tsx` — redesign green box into structured section
- `src/lib/simuladorUtils.ts` — NIE 80% → 90% (3 edits)

## What does NOT change
- Calculation logic (formulas remain identical)
- PDF generator
- Approval rules
- Personal credit rules

