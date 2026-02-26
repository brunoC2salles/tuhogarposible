
# Plan: Fix Round-Robin Agent Assignment and Retroactive Lead Fix

## Root Cause Analysis

The `get-next-agent` edge function is returning a **500 error**: `malformed array literal: "Cataluña"`. This happens because the database column `region_round_robin` was migrated from `text` to `text[]`, but the **deployed** edge functions were never redeployed to match the new code. The old deployed version likely uses `.eq()` queries that fail with array columns.

**Result:** Every qualified lead from Meta Ads enters the CRM with `agente_asignado_id = null` and no Bitrix webhook is triggered (since the webhook only fires when an agent is assigned).

**35 leads** are currently in `nuevo_lead` stage without an agent.

---

## Plan (3 parts)

### Part 1: Redeploy Edge Functions

Simply redeploy `get-next-agent` and `meta-lead-webhook`. The code in the repository is already correct (uses JS-level array filtering, not PostgREST array operators). The issue is only that the deployed version is stale.

**Files:** No changes needed. Just deploy.

### Part 2: Create One-Time Fix Edge Function

Create a new edge function `fix-unassigned-leads` that:

1. Queries all leads with `stage = 'nuevo_lead' AND agente_asignado_id IS NULL`
2. For each lead:
   - Determines the comunidad autonoma from `zona_interes` (using the same `CIUDADES_COMUNIDAD_MAP`)
   - Runs round-robin logic inline (same as `get-next-agent`): find agents with matching region, fallback to highest coverage
   - Assigns the agent via `UPDATE leads SET agente_asignado_id = ...`
   - Sends the Bitrix webhook payload (same flattened format as `meta-lead-webhook`)
3. Returns a summary of all assignments made

**Round-robin for 35 leads distribution:**
- 4 active agents with regions: Gerardo (16 regions), Jose Maria (16), Marie (16), Xavier (1 = Cataluna)
- Leads in Cataluna zones go to Xavier
- All other leads rotate between Gerardo, Jose Maria, and Marie
- Unknown zones go to fallback (agents with most regions = Gerardo/Jose Maria/Marie)

**File to create:** `supabase/functions/fix-unassigned-leads/index.ts`

This function will be called once manually, then can be deleted.

### Part 3: Expand City-to-Region Mapping

Some leads have locations not currently mapped (e.g., "Alovera", "Paterna", "Seseña", "colmenar viejo", "puerto del rosario", "Ponferrada", "La alberca"). I'll add these to both `meta-lead-webhook` and `fix-unassigned-leads`:

- Alovera -> Castilla-La Mancha (Guadalajara)
- Paterna -> Comunidad Valenciana
- Sesena -> Castilla-La Mancha
- Colmenar Viejo -> Comunidad de Madrid
- Puerto del Rosario -> Canarias (Fuerteventura)
- Ponferrada -> Castilla y Leon
- La Alberca -> Region de Murcia (or Salamanca - will use Murcia as more common)
- Sabadell -> Cataluna
- Vilanova/Geltru -> Cataluna
- Mostoles/Leganes/Pinto -> Comunidad de Madrid
- Yuncos/Illescas -> Castilla-La Mancha

Also fix the incorrect mappings in the current code:
- `'bilbao': 'Cataluna'` is WRONG -> should be fallback (null) since Pais Vasco is not in the list
- `'pamplona': 'Comunidad de Madrid'` is WRONG -> should be null (Navarra not in list)

**Files to modify:**
- `supabase/functions/meta-lead-webhook/index.ts` (lines 55, 74: fix Bilbao/Pamplona mapping + add new cities)

---

## Files Summary

| File | Action | Change |
|---|---|---|
| `supabase/functions/get-next-agent/index.ts` | Deploy only | No code changes needed |
| `supabase/functions/meta-lead-webhook/index.ts` | Edit + Deploy | Fix wrong city mappings (Bilbao, Pamplona) + add ~15 new cities |
| `supabase/functions/fix-unassigned-leads/index.ts` | Create + Deploy | One-time function to assign 35 leads + send to Bitrix |
| `supabase/config.toml` | Edit | Add `fix-unassigned-leads` with `verify_jwt = false` |

---

## Execution Sequence

1. Fix city mappings in `meta-lead-webhook`
2. Create `fix-unassigned-leads` function
3. Update `config.toml`
4. Deploy all 3 functions
5. Call `fix-unassigned-leads` once to fix the 35 leads
6. Verify with DB query that agents are assigned
7. Delete `fix-unassigned-leads` after confirmation

---

## What is NOT touched

- Frontend code (zero changes)
- Database schema (no migrations)
- `get-next-agent` code (already correct, just needs deploy)
- RLS policies
- Other edge functions
