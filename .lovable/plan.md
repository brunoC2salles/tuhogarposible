

# Plan: Ensure Edad is Correctly Received, Parsed, Used in Simulations, and Sent to Bitrix

## Problem Found

There is a **sequencing bug** in `meta-lead-webhook`: the `parseEdad()` function (which handles strings, birth years, etc.) runs **after** the qualification step. The qualification check (`data.edad >= 66`) only works with raw numbers, but Make.com may send edad as a string (e.g., `"35"` or `"1990"`).

Everything else in the pipeline is already correct:
- `parseEdad` correctly handles multiple formats (direct age, birth year, string extraction)
- Edad is stored in the lead `notas` field
- Edad is used in `calcularSimulacionHipotecaria()` to cap the loan term (75 - age)
- Edad is sent to Bitrix as `lead_edad` in the flattened payload
- `make-webhook-proxy` extracts edad from notes via regex for test/assignment actions

## Changes Required

### 1. Fix sequencing in `meta-lead-webhook/index.ts`

Move `parseEdad(data)` call **before** `qualificarLead()`, and pass the parsed edad into the qualification function so the age >= 66 check works with all input formats.

**Current order (broken):**
```text
1. qualificarLead(data, ingresos)  -- checks data.edad (raw, may be string)
2. parseEdad(data)                  -- parses properly but too late
```

**New order (fixed):**
```text
1. parseEdad(data)                  -- parse first
2. qualificarLead(data, ingresos, edadParsed)  -- use parsed value
```

**Specific changes:**
- Move `const edadParsed = parseEdad(data);` from line 687 to before line 621 (before qualification)
- Update `qualificarLead` signature to accept `edad?: number | null` as third parameter
- Change the age check from `data.edad >= 66` to using the parsed edad parameter
- No other files need changes

### 2. Redeploy

Redeploy `meta-lead-webhook` after the fix.

---

## What is NOT touched

- `make-webhook-proxy` (already correct -- extracts edad from notes)
- `get-next-agent` (no edad logic)
- Frontend simulator code (edad handled separately in the UI)
- Database schema (no changes)
- No new files created

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/meta-lead-webhook/index.ts` | Move parseEdad before qualificarLead; update qualificarLead signature to use parsed edad |

## Verification

After deployment, the flow will be:
1. Make.com sends `"edad": "35"` (or birth year, or number)
2. `parseEdad` converts to integer `35`
3. `qualificarLead` uses `35` for age >= 66 check
4. `calcularSimulacionHipotecaria` uses `35` to cap loan term at `75 - 35 = 40` (capped at 30)
5. Lead notes store `Edad: 35`
6. Bitrix payload sends `lead_edad: 35`

