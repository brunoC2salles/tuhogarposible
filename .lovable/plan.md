

# Plan: 6 Adjustments — Age Disqualification, Lead Card, Emojis, Plan de Pagos Fix, TIN/TAE, Remove Lead Search

## Summary of Changes

| # | Change | Files |
|---|--------|-------|
| 1 | Disqualify Meta Ads leads aged 55+ (was 66+) | `meta-lead-webhook/index.ts` |
| 2 | Show `ingresosMensuales` on LeadCard | `LeadCard.tsx` |
| 3 | Remove emojis from LeadCard and lead notes | `LeadCard.tsx`, `meta-lead-webhook/index.ts` |
| 4 | Fix plan de pagos/gap in notes when no market price | `meta-lead-webhook/index.ts` |
| 5 | Add TIN/TAE info to simulator results + PDF | `ResultadosCombinados.tsx`, `pdfGenerator.ts` |
| 6 | Remove lead name search from simulator | `SimuladoresIndex.tsx` |

---

## Detail

### 1. Age disqualification: 66 → 55 (`meta-lead-webhook/index.ts`)

**Line 464**: Change `edadParsed >= 66` to `edadParsed >= 55`
**Line 465**: Change reason to `'Edad superior a 54 años'`

No other files affected — the frontend simulator already has `max="65"` on the age field.

### 2. Show ingresos mensuales on LeadCard (`LeadCard.tsx`)

The lead's `simulador_hipotecario_data` (or `simulador_personal_data`) stores income data. Add a line after the `valor_inmueble_deseado` display (line ~187):

- Extract `ingresosMensuales` from `lead.simulador_hipotecario_data?.ingresosMensuales` or from the Meta Ads stored data
- Display as: `DollarSign icon + "Ingresos: X€/mes"`
- Format using Euro (not CLP — also fix the existing `formatCurrency` which wrongly uses CLP, should use EUR)

### 3. Remove emojis from LeadCard and notes

**`LeadCard.tsx`**: No emojis currently present in the card itself — badges are text-only. No changes needed here.

**`meta-lead-webhook/index.ts`** (lines 830-845): Remove emoji prefixes from `notasLead`:
- `✅` → remove
- `❌` → remove  
- `📋` → remove
- `💳` → remove
- `📊` → remove
- `💰` → remove
- `⚠️` → remove

**`ResultadosCombinados.tsx`**: Remove emojis from section headers and badges:
- Line 78: `💳 Crédito Personal` → `Crédito Personal`
- Line 132: `🏠 Crédito Hipotecario` → `Crédito Hipotecario`
- Line 114: `✓ CANDIDATO CUALIFICADO` → keep checkmark (it's a text symbol, not emoji)
- Line 169: `⚠️ Capital Propio Insuficiente` → `Capital Propio Insuficiente`
- Line 178: `💳 Capital cubierto...` → `Capital cubierto...`
- Line 246: `📊 Plan de Pagos` → `Plan de Pagos`
- Lines 331, 338: `⚠️ Atención` → `Atención`

### 4. Fix plan de pagos when no market price (`meta-lead-webhook/index.ts`)

The `gap` calculation (line 718) depends on `capitalNecesario` from `simulacionHipotecaria.capital_necesario`. This is calculated from the mortgage simulation, NOT from market prices. So the plan de pagos should work regardless of market data.

However, the issue is that when `capitalNecesario` is 0 (no property value available from Meta Ads), the gap is 0, and the plan de pagos lines are skipped (`gap > 0` check on lines 842-843). 

**Fix**: Always include plan de pagos info in notes when both simulations have valid data (cuota > 0), regardless of gap. Change condition from `gap > 0` to `cuotaHipoteca > 0 || cuotaPersonal > 0`. When gap is 0, note should say "Sin necesidad de crédito personal adicional" instead of omitting the info entirely.

### 5. Add TIN/TAE to results + PDF

**`ResultadosCombinados.tsx`**: After the mortgage cuota section (around line 159, after the `Máx. financiable` text), add:
```
TIN 1,6% (primeros 10 años) · TAE 1,72% - Euribor + 0,35% (resto de años)
```
As a small `text-xs text-muted-foreground` annotation below the existing mortgage rate display.

**`pdfGenerator.ts`**: After the mortgage table (line ~567, after `currentY = finalY + 5`), add a text line:
```
TIN 1,6% (primeros 10 años) · TAE 1,72% - Euribor + 0,35% (resto de años)
```

### 6. Remove lead name search from simulator (`SimuladoresIndex.tsx`)

Remove all lead auto-fill code:
- **State variables** (lines 45-49): `leadSuggestions`, `showSuggestions`, `isAuthenticated`, `debounceRef`, `suggestionsRef`
- **Auth check useEffect** (lines 111-115)
- **`searchLeads` callback** (lines 118-139)
- **`selectLead` callback** (lines 141-169)
- **Outside click useEffect** (lines 172-180)
- **In the form** (lines 288-317): Remove the `ref={suggestionsRef}`, the `onChange` handler calling `searchLeads`, the `Search` icon, and the suggestions dropdown
- **Import**: Remove `Search` from lucide-react imports, remove `useCallback` and `useRef` if no longer needed

This is a clean removal — no backend changes needed since it was a frontend-only query.

---

## What does NOT change
- Simulator calculation logic (`simuladorUtils.ts`)
- Database schema
- Mortgage approval rules
- PDF structure (only adds TIN/TAE line)
- Make webhook proxy (notes format change is cosmetic)
- LeadDetailsModal simulator tab (separate concern)

