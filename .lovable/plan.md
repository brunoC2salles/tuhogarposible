## Objetivo

Corregir la sobreestimación de "créditos/deudas mensuales" en el lector interno de extractos bancarios. Hoy se estaban contando como deuda lanzamientos que NO son crédito (Legalitas, Cambridge House) y créditos ya finalizados.

## Cambios

### 1. `supabase/functions/_shared/internalStatementAnalysis.ts` — bloque GENÉRICO del prompt

Ampliar las reglas globales (no solo BBVA), aplicables a cualquier banco español (Sabadell, BBVA, Santander, CaixaBank, ING, etc.):

**a) Lista explícita de NO-deudas (ignorar siempre, aunque sean recurrentes):**
- Seguros y asistencias: `LEGALITAS`, `MUTUA`, `MAPFRE`, `ALLIANZ`, `AXA`, `ZURICH`, `LINEA DIRECTA`, `OCASO`, `SANITAS`, `ADESLAS`, `DKV`, y cualquier `SEGURO …`.
- Educación / mensualidades escolares: `ESTUDIOS …`, `COLEGIO …`, `ACADEMIA …`, `CAMBRIDGE …`, `ESCUELA …`, `UNIVERSIDAD …`, `MATRICULA …`.
- Suministros: luz, agua, gas, internet, telefonía (`FACTOR ENERGIA`, `IBERDROLA`, `ENDESA`, `NATURGY`, `MOVISTAR`, `VODAFONE`, `ORANGE`, `MASMOVIL`, `O2`, `DIGI`, `CANAL ISABEL`, `AGUAS DE …`).
- Impuestos y tasas: `AYUNTAMIENTO`, `AGENCIA TRIBUTARIA`, `HACIENDA`, `IBI`, `IVTM`, `TASA`.
- Suscripciones digitales: `NETFLIX`, `SPOTIFY`, `HBO`, `DISNEY`, `PRIME VIDEO`, `APPLE`, `GOOGLE`, `MICROSOFT`.
- Gimnasios: `BASIC FIT`, `MCFIT`, `VIRGIN ACTIVE`, `ALTAFIT`, `SYNERGY`.

Razón: aunque sean débitos recurrentes, no son préstamos/créditos al consumo y no afectan al ratio DTI hipotecario igual que una financiación.

**b) Definición estricta de CRÉDITO/DEUDA recurrente (lista cerrada):**
Solo cuenta como deuda si el concepto contiene:
- `FINANCIERA …` (SOFINCO, CETELEM, COFIDIS, WIZINK, CAIXABANK PAYMENTS CONSUMER, SANTANDER CONSUMER, BBVA CONSUMER, ABANCA CONSUMER, BANKINTER CONSUMER, OPENBANK CONSUMER, EVO FINANCE, CARREFOUR PASS, CETELEM, YOUNITED, MONEYMAN, VIVUS, CREDITEA).
- `PRESTAMO …`, `CREDITO …`, `HIPOTECA …`, `AMORTIZACION DE PRESTAMO`, `CUOTA PRESTAMO`, `CUOTA HIPOTECA`.
- `LEASING …`, `RENTING …` con entidad financiera.
- `TARJETA REVOLVING …`, `PAGO APLAZADO …`.

**c) Regla de "crédito activo" (la más importante):**
Un crédito solo cuenta si:
1. Aparece en el **mes más reciente** del extracto (o en uno de los 2 últimos meses), Y
2. Tiene al menos **2 cuotas detectadas en los últimos 6 meses**.

Si la última cuota detectada es anterior a 3 meses respecto al final del extracto → el crédito ha terminado y NO se debe sumar a `monthly_debts`. Añadir warning: `"Crédito X finalizado, no incluido en deuda activa"`.

**d) Cálculo de `monthly_debts`:**
- Sumar SOLO las cuotas de créditos activos (regla c) presentes en el último mes del extracto.
- Si en el último mes no hay esa cuota pero sí en los 2 anteriores con regularidad → usar el valor más reciente.
- Devolver además un nuevo campo `active_debts_detail` (array de `{concepto, monthly_amount, last_seen_month}`) para auditoría.

### 2. Schema de la function tool

Añadir el campo `active_debts_detail` al schema en `extract_bank_statement_financials.parameters.properties.titulares.items.properties`:

```ts
active_debts_detail: {
  type: "array",
  items: {
    type: "object",
    properties: {
      concepto: { type: "string" },
      monthly_amount: { type: "number" },
      last_seen_month: { type: "string", description: "YYYY-MM" },
    },
  },
}
```

### 3. Tipo `StatementAiHolder`

Añadir `active_debts_detail?: Array<{ concepto: string; monthly_amount: number; last_seen_month: string }>` al interface.

### 4. Persistencia

`active_debts_detail` ya cabe dentro de `lead_document_analysis.full_result` (jsonb). No requiere migración nueva.

### 5. Memoria del proyecto

Crear `mem://features/statement-debt-classification-rules` con:
- Lista de NO-deudas (seguros, educación, suministros, impuestos, suscripciones, gimnasios).
- Whitelist de créditos reales.
- Regla de crédito activo (última cuota ≤ 3 meses).

Y añadir entrada al `mem://index.md`.

### 6. Validación

Re-procesar manualmente el extracto Sabadell de Iván Darío Ramírez:
- Antes: ~247 €/mes (incluía Legalitas + Cambridge + financieras).
- Después esperado: **~184,63 €/mes** (solo SOFINCO 84,63 + CAIXABANK PAYMENTS CONSUMER 100,00, ambos activos en mayo 2026).

No hay test automático del prompt; la validación es la nueva ejecución sobre el mismo PDF.

## Fuera de alcance

- No tocamos las reglas específicas de BBVA (siguen funcionando).
- No tocamos el cálculo de hipoteca máxima ni el DTI (siguen igual; mejorará automáticamente al bajar `monthly_debts`).
- No reprocesamos retroactivamente análisis ya guardados; solo nuevos uploads aplicarán las reglas nuevas.
