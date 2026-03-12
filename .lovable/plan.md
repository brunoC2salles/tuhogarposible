

# Plan: Integrate Combined Mortgage+Personal Credit Logic into Meta Lead Webhook & Bitrix Payload

## Problem
The `meta-lead-webhook` calculates personal and mortgage simulations independently. The personal credit should specifically finance the **gap** between `capital_necesario` (mortgage down payment) and the lead's `monto_ahorros` (savings). The combined payment plan (two phases) also needs to be sent to Bitrix.

## Changes

### 1. `supabase/functions/meta-lead-webhook/index.ts`

**Modify `calcularSimulacionPersonal`** to accept the financing gap as a parameter:
- New signature: `calcularSimulacionPersonal(ingresos, deudas, montoNecesario?)`
- If `montoNecesario` is provided, calculate the cuota for that specific amount (instead of max capacity)
- Keep the existing generic calculation as fallback when no gap is provided

**After calling both simulators (line ~692)**, add the combined logic:
```
1. Parse monto_ahorros from Meta Ads data
2. gap = capital_necesario - ahorros (min 0)
3. If gap > 0, recalculate personal credit for that exact amount
4. Calculate combined plan: Phase 1 (mortgage + personal cuota), Phase 2 (mortgage only)
```

**Add new fields to `bitrixPayload`** (line ~962):
- `plan_fase1_cuota_total` — combined monthly payment
- `plan_fase1_duracion_meses` — personal credit duration
- `plan_fase2_cuota_total` — mortgage-only payment
- `plan_fase2_duracion_meses` — remaining mortgage months
- `plan_total_coste` — total acquisition cost
- `plan_ahorro_mensual_tras_personal` — monthly savings after personal credit ends
- `sim_personal_monto_financiado` — actual gap amount financed by personal credit

**Add combined info to `notasLead`**:
- "Plan de pagos: Fase 1 (X meses): Y€/mes | Fase 2 (Z meses): W€/mes"

### 2. `supabase/functions/make-webhook-proxy/index.ts`

**All 3 actions** (`test_meta_bitrix_last_lead`, `send_lead_assignment`, `test_qualified_last_submission`):
- Add the same `plan_*` fields to their payloads, reading from the stored `simulador_personal_data` and `simulador_hipotecario_data` on the lead
- Recalculate the combined plan from stored simulation data + `monto_ahorros` extracted from notes

### 3. Stored simulation data
The `simulador_personal_data` saved to the lead will now include `monto_financiado` (the gap amount) so the make-webhook-proxy can reconstruct the payment plan without recalculating.

## No changes to
- Frontend simulator (already works correctly)
- Database schema (simulation data is stored as JSONB)
- Qualification logic (personal credit is informational only)

