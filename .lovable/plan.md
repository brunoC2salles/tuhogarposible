

# Plan: Fix Simulator Inconsistencies & CRM Integration

## Issues Identified

1. **CRM still opens separate simulators** — `SimuladoresModal.tsx` links to individual pages instead of unified `/simuladores`
2. **Mortgage rate 3.5% should be 2.5%** — hardcoded in `simuladorUtils.ts` line 369 and displayed in `SimuladorCreditoHipotecario.tsx` line 167
3. **Duplicated fields** — `valorInmueble` + `precioVivienda` (same thing), `entrada` + `ahorrosDisponibles` (both represent savings/initial payment), `deudasActuales` + `creditos` (both represent debts)
4. **Critical approval logic bug** — A client with max financeable 180k gets "HIPOTECA APROBABLE" for a 315k mortgage. The check on line 562 never compares `montoFinanciable <= montoMaximoFinanciable`
5. **Ahorros not reducing capital propio** — `capitalPropioSuficiente` is calculated but never used in the `aprobable` flag (line 562)
6. **Missing red field validation** — Form errors exist but many fields in the unified form don't display error messages

---

## Changes

### 1. `SimuladoresModal.tsx` — Point to unified simulator
- Replace the two separate buttons with a single button that opens `/simuladores?leadId=X&leadNombre=Y`
- Remove the "choose which simulator" UI — it's now one unified form

### 2. `simuladorUtils.ts` — Fix mortgage rate & approval logic
- **Line 369**: Change `tasaAnualFija = 3.5` → `tasaAnualFija = 2.5`
- **Line 562**: Add `montoFinanciable <= montoMaximoFinanciable` to approval criteria:
  ```
  const aprobable = aprobablePorIngresos && capacidadMinimaSuficiente 
    && cumpleMinimoFinanciable && montoFinanciable <= montoMaximoFinanciable;
  ```
- Add a new `razonNoAprobado` case: "El monto a financiar (X€) supera el máximo financiable según capacidad de pago (Y€)"

### 3. `SimuladoresIndex.tsx` — Unify duplicated fields & add validation display
**Remove duplicates:**
- Remove `valorInmueble` from Section 2 (personal credit). Use `precioVivienda` for both calculations
- Remove `entrada` from Section 2. Use `ahorrosDisponibles` as the "entrada" for personal credit (savings available = initial payment capacity)
- Remove `deudasActuales` from Section 2. Compute debts from `creditos` array (sum of `cuotaMensual`) for the personal credit calculation
- Update `onSubmit` to derive these values:
  ```ts
  const totalDeudas = data.creditos?.reduce((s, c) => s + c.cuotaMensual, 0) ?? 0;
  const resPersonal = calcularAmortizacionFrancesa({
    valorInmueble: resHipoteca.capitalPropioNecesario,
    entrada: data.ahorrosDisponibles,  // ahorros = entrada
    plazoMeses: data.plazoMeses,
    tasaAnual: data.tasaAnual,
    ingresos: data.ingresosMensuales,
    deudas: totalDeudas,               // from creditos
  });
  ```

**Update schema:** Remove `entrada`, `deudasActuales`, `valorInmueble` from `simuladorUnificadoSchema` (keep only `plazoMeses` and `tasaAnual` as personal-credit-specific fields)

**Default rate:** Change `tasaAnual` default from `6` to `6` (personal credit stays) — but add default for mortgage display text `2.5%`

**Add red borders on invalid fields:** Apply `className={form.formState.errors.fieldName ? 'border-destructive' : ''}` to all Input/Select fields

### 4. `SimuladorCreditoHipotecario.tsx` — Update rate display
- Line 167: Change `3.5% anual` → `2.5% anual`

### 5. `ResultadosCombinados.tsx` — Adjust data references
- Update references from `datos.entrada` → `datos.ahorrosDisponibles`
- Update references from `datos.deudasActuales` → computed total from `datos.creditos`
- Update mortgage rate display from 3.5% to match the new rate

### 6. `pdfGenerator.ts` / `pdfGeneratorComplete.ts` — Update rate references
- Any hardcoded 3.5% references → 2.5%

---

## What does NOT change
- Personal credit business logic (20% rule, linear max formula)
- Mortgage qualification rules (35%, 350€ min, 70k min, 180k/210k caps)
- Individual simulator pages (`/simuladores/credito-personal`, `/simuladores/credito-hipotecario`) — they remain for backward compatibility
- Schema validations, database, edge functions
- Market price integration

## Summary of field unification

| Before (duplicated) | After (unified) |
|---|---|
| `valorInmueble` (personal) + `precioVivienda` (mortgage) | Use `precioVivienda` only |
| `entrada` (personal) + `ahorrosDisponibles` (mortgage) | Use `ahorrosDisponibles` only |
| `deudasActuales` (personal) + `creditos[]` (mortgage) | Use `creditos[]`, compute total |

