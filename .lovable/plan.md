

# Plan: Personal Credit — 25% → 20% + New Max Formula

## What Changes

Two adjustments to personal credit only:

1. **Qualification rule**: `cuota ≤ (ingresos × 0.20) - deudas` (was 0.25)
2. **Monto máximo formula**: `((ingresos × 0.20) - deudas) × plazoMeses` — simple linear multiplication replacing the reverse French amortization formula

## Files to Modify

### 1. `src/lib/simuladorUtils.ts` (lines 52-66)
- Change `0.25` → `0.20` on lines 53 and 57
- Replace reverse French formula for `montoMaximoCredito` with: `capacidadMensual * plazoMeses`
- Remove the French inverse branch (lines 60-66), replace with simple multiplication

### 2. `src/components/simuladores/ResultadosCombinados.tsx`
- Line 85: `"25%"` → `"20%"`
- Lines 104-106: Update explanation text from 25% to 20%, update formula display

### 3. `src/components/simuladores/ResultadosSimulacion.tsx`
- Update "25%" text reference

### 4. `src/components/simuladores/ResultadosSimulacao.tsx`
- Update threshold from 25 to 20 in the percentage badge

### 5. `src/lib/pdfGenerator.ts`
- Line 497: `"25%"` → `"20%"` in PDF table label

## What does NOT change
- Mortgage logic (35% rule, 350€ min, 70k min, 180k/210k caps)
- Cuota mensual calculation (French amortization stays for installment calc)
- Edge functions, schema, UI layout

