

# Plan: Adjust Max Credit Display + Auto-fill Lead Data in Simulator

## Change 1: Make "Máximo Crédito" a secondary annotation (not the main info)

**File:** `src/components/simuladores/ResultadosCombinados.tsx`

**Current state:** Lines 100-104 and 158-163 show "Máximo Crédito Personal" and "Máximo Financiable" as large green boxes (`bg-green-50`, `border-2 border-green-500`, `text-xl font-bold`) — they dominate the section visually.

**Change:** Demote these two boxes to a small footnote/annotation below the main metrics:
- Remove the large green bordered boxes for "Máximo Crédito Personal" (line 101-104) and "Máximo Financiable" (line 159-163)
- Replace each with a small `text-xs text-muted-foreground` line under the "Cuota Mensual" box, e.g.: `"Crédito máximo: 45.000€ (20% ingresos - deudas)"`
- The "Cuota Mensual" and "Total a Pagar" boxes remain as the primary visual elements in each section

This keeps the max credit info accessible but stops it from being the visual focus.

---

## Change 2: Auto-fill form when agent types a lead name from CRM

**File:** `src/pages/simuladores/SimuladoresIndex.tsx`

**How it works:**
1. Add a debounced search (300ms) on the `nombreCompleto` field that queries the `leads` table: `supabase.from('leads').select('*').ilike('nombre_completo', '%name%').limit(5)`
2. Show a small dropdown list below the name input with matching leads (name + phone for disambiguation)
3. When the agent clicks a lead from the dropdown, auto-fill the form fields that exist in the lead record:
   - `nombreCompleto` ← `nombre_completo`
   - `precioVivienda` ← `valor_inmueble_deseado` (if set)
   - `zona_interes` / `ciudad_interes` → not form fields, skip
   - If `simulador_hipotecario_data` or `simulador_personal_data` exist on the lead, pre-fill relevant financial fields from there
4. The dropdown only appears when the user is authenticated (agent/admin) — for public visitors the name field works as a plain input with no lookup

**Performance notes:**
- Only triggers after 2+ characters typed, debounced 300ms
- Query limited to 5 results
- No new hooks/contexts — inline `supabase` query in a `useEffect` or `useCallback`
- Dropdown dismissed on blur or selection

**No other files changed.** No database changes needed — uses existing `leads` table with existing RLS policies (agents see their own leads, admins see all).

