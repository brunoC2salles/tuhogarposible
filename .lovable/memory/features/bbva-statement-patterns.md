---
name: BBVA bank statement patterns
description: Specific recognition rules for BBVA statements (concepts, balance, period header) used by the internal statement reader.
type: feature
---

The internal statement reader (`supabase/functions/_shared/internalStatementAnalysis.ts`) has explicit per-bank rules for BBVA, in addition to the generic Spanish prompt.

## Detection
- BIC `BBVAESMM`
- IBAN starting with `ES.. 0182`
- Header `EXTRACTO MENSUAL DE CUENTAS PERSONALES`
- Helper: `detectBankFromText()` returns `"BBVA"`.

## Statement structure
- Table columns: `F.Oper. | F.Valor | Concepto | Importe | Saldo`
- Holder: line `Titulares: NOMBRE COMPLETO`
- Period header: `EXTRACTO DE [MES_ES] [AAAA]` (e.g. `EXTRACTO DE MARZO 2026`)
- First row: `SALDO ANTERIOR ----` with opening balance.

## Concept classification (BBVA)
**Recurring income (nómina):**
- `ABONO DE NOMINA POR TRANSFERENCIA` + employer name.
- `TRANSFERENCIAS` whose concept contains `NOMINA`.

**Recurring debts:**
- `ADEUDO A SU CARGO` referencing financiers (COFIDIS, CETELEM, WIZINK, etc.).
- `ADEUDO DE ENTIDAD FINANCIERA` (e.g. CAIXABANK PAYMENTS CONSUMER).
- `CARGO POR AMORTIZACION DE PRESTAMO/CREDITO` (BBVA's own loan amortization).

**MUST IGNORE for income/debt totals:**
- `BIZUM` (sent or received)
- `INGRESO EN EFECTIVO`
- `RET. EFECTIVO A DEBITO CON TARJ. EN CAJERO`
- `PAGO CON TARJETA EN ...` / `PAGO CON TARJETA DE ...`
- `TRANSFERENCIAS` with concept `ALQUILER` (it's the client paying rent, not a financial debt)
- `LIQUIDACION DE INTERESES-COMISIONES-GASTOS`
- `CARGO POR PAGO DE IMPUESTOS - TRIBUTOS`

## Final balance (savings_balance) — BBVA
At the bottom of the statement:
- `SALDO A SU FAVOR [N]` → POSITIVE balance (use as `savings_balance`).
- `SALDO A NUESTRO FAVOR [N]` → NEGATIVE balance (overdraft). Set `savings_balance = 0` and emit a warning.

Helper: `parseBbvaFinalBalance(text)` returns the signed numeric balance for deterministic fallback when the AI returns 0.
