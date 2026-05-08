---
name: Bank statement debt classification rules
description: Strict rules for classifying recurring debts in the internal statement reader (whitelist, blacklist, active-credit rule).
type: feature
---

The internal statement reader (`supabase/functions/_shared/internalStatementAnalysis.ts`) classifies `monthly_debts` using strict rules that apply to ALL Spanish banks (Sabadell, BBVA, Santander, CaixaBank, ING, etc.).

## A charge counts as debt ONLY if ALL apply
1. It belongs to the WHITELIST (loans, consumer credit, mortgage, leasing/renting financiero, revolving cards, deferred payments).
2. **Active credit rule**: appears in the LAST month of the statement (or one of the last 2 months) AND has at least 2 instalments in the last 6 months.
3. If the last instalment is older than 3 months from the statement end → credit is FINISHED, NOT counted. Add warning `"Crédito X finalizado, no incluido en deuda activa"`.

## WHITELIST (real credit)
- `FINANCIERA …` (SOFINCO, CETELEM, COFIDIS, WIZINK, CAIXABANK PAYMENTS CONSUMER, SANTANDER CONSUMER, BBVA CONSUMER, ABANCA CONSUMER, BANKINTER CONSUMER, OPENBANK CONSUMER, EVO FINANCE, CARREFOUR PASS, YOUNITED, MONEYMAN, VIVUS, CREDITEA).
- `PRESTAMO`, `CREDITO`, `HIPOTECA`, `AMORTIZACION DE PRESTAMO/CREDITO`, `CUOTA PRESTAMO`, `CUOTA HIPOTECA`.
- `LEASING`, `RENTING` con entidad financiera.
- `TARJETA REVOLVING`, `PAGO APLAZADO`.

## BLACKLIST (NEVER debt, even if recurring)
- **Seguros**: LEGALITAS, MUTUA, MAPFRE, ALLIANZ, AXA, ZURICH, LINEA DIRECTA, OCASO, SANITAS, ADESLAS, DKV, GENERALI, cualquier `SEGURO`/`ASISTENCIA`.
- **Educación**: ESTUDIOS, COLEGIO, ACADEMIA, CAMBRIDGE, ESCUELA, UNIVERSIDAD, MATRICULA, GUARDERIA.
- **Suministros**: FACTOR ENERGIA, IBERDROLA, ENDESA, NATURGY, REPSOL, MOVISTAR, VODAFONE, ORANGE, MASMOVIL, O2, DIGI, YOIGO, CANAL ISABEL, AGUAS DE..., EMASESA.
- **Impuestos/tasas**: AYUNTAMIENTO, AGENCIA TRIBUTARIA, HACIENDA, IBI, IVTM, TASA, TRIBUTO.
- **Suscripciones**: NETFLIX, SPOTIFY, HBO, DISNEY, PRIME VIDEO, APPLE, GOOGLE, MICROSOFT, AMAZON PRIME.
- **Gimnasios**: BASIC FIT, MCFIT, VIRGIN ACTIVE, ALTAFIT, SYNERGY, GIMNASIO.
- **Alquiler**: ALQUILER (gasto, no deuda financiera).
- BIZUM, retiradas en cajero, compras con tarjeta, ingresos en efectivo, comisiones bancarias.

## Output
The AI returns `active_debts_detail: Array<{concepto, monthly_amount, last_seen_month}>` and `monthly_debts` MUST equal the sum of `monthly_amount` from that list. If no active credits → `monthly_debts = 0`.
