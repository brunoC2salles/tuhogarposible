
## Aprendizaje del formato BBVA

Después de analizar los dos extractos, identifiqué patrones claros y específicos del BBVA que vale la pena enseñar al lector interno:

### Estructura BBVA detectada
- **Cabecera**: `EXTRACTO MENSUAL DE CUENTAS PERSONALES` + `EXTRACTO DE [MES] [AÑO]`
- **IBAN**: formato `IBAN ES21 0182 5332 ...` (código BBVA = `0182`)
- **BIC**: `BBVAESMM` — confirma banco BBVA
- **Titulares**: línea `Titulares: NOMBRE COMPLETO`
- **Tabla**: columnas `F.Oper. | F.Valor | Concepto | Importe | Saldo`
- **Saldo final**: línea `SALDO A SU FAVOR [importe]` o `SALDO A NUESTRO FAVOR [importe]` (este último indica saldo NEGATIVO)
- **Saldo anterior**: fila `SALDO ANTERIOR ----` con saldo inicial del mes

### Conceptos BBVA que SON ingresos recurrentes (nómina)
- `ABONO DE NOMINA POR TRANSFERENCIA` + nombre empresa (ej: `PENALVER MESA S.L.`) → nómina clara
- `TRANSFERENCIAS\nNOMINA [MES] [NOMBRE]` → también es nómina (formato variante)

### Conceptos BBVA que SON deudas recurrentes
- `ADEUDO A SU CARGO ... COFIDIS` → cuota préstamo Cofidis (recurrente mensual)
- `ADEUDO DE ENTIDAD FINANCIERA ... CAIXABANK PAYMENTS CONSUMER` → cuota financiera (recurrente)
- `CARGO POR AMORTIZACION DE PRESTAMO/CREDITO` → cuota préstamo BBVA (recurrente)

### Conceptos BBVA a IGNORAR para ingresos/deudas
- `BIZUM RECIBIDO/ENVIADO: Sin concepto` → NO es ingreso recurrente
- `INGRESO EN EFECTIVO` → NO es nómina
- `RET. EFECTIVO A DEBITO CON TARJ. EN CAJERO` → retirada cajero, no es deuda
- `PAGO CON TARJETA EN ...` → gasto puntual, no deuda
- `TRANSFERENCIAS\nALQUILER ...` → es alquiler que paga el cliente (gasto), NO confundir con deuda financiera
- `LIQUIDACION DE INTERESES-COMISIONES-GASTOS` → gasto bancario puntual
- `CARGO POR PAGO DE IMPUESTOS - TRIBUTOS` → impuestos, no deuda recurrente

### Saldo final / ahorros
- En BBVA el saldo final está al pie: `SALDO A SU FAVOR 6,83` (positivo) o `SALDO A NUESTRO FAVOR 72,97` (negativo, deuda con el banco).
- Ojo: ambos clientes terminaron con saldo muy bajo o negativo → ahorros ≈ 0.

## Plan de implementación

### 1. Enriquecer el system prompt en `analyzeStatementsWithAi`
Archivo: `supabase/functions/_shared/internalStatementAnalysis.ts`

Añadir un bloque específico de "Reglas por banco — BBVA" al `systemPrompt`, con la guía anterior:
- Reconocer banco por BIC `BBVAESMM` o IBAN que empieza por `ES.. 0182`.
- Lista explícita de conceptos = ingreso recurrente.
- Lista explícita de conceptos = deuda recurrente.
- Lista explícita de conceptos a IGNORAR.
- Interpretación de `SALDO A NUESTRO FAVOR` como saldo NEGATIVO al cliente.

### 2. Añadir detección determinística de banco BBVA
Nueva función helper `detectBankFromText(text)` que reconozca BBVA cuando aparezca `BBVAESMM`, `IBAN ES.. 0182` o `EXTRACTO MENSUAL DE CUENTAS PERSONALES`. Usarlo como hint extra al pasar al modelo (`Banco detectado: BBVA`) para activar el contexto correcto.

### 3. Mejorar parser de saldo final BBVA (determinístico)
Añadir parser que extraiga `SALDO A SU FAVOR [num]` (positivo) o `SALDO A NUESTRO FAVOR [num]` (negativo) como fallback cuando el modelo devuelva `savings_balance = 0`. Esto evita perder el saldo cuando la IA falla.

### 4. Guardar memoria del aprendizaje
Crear `mem://features/bbva-statement-patterns` con las reglas específicas del banco para futuras iteraciones (Santander, ING, etc.).

### Detalles técnicos
- Cambios solo en `supabase/functions/_shared/internalStatementAnalysis.ts` (sin modificar contratos públicos).
- No requiere migración DB.
- Deploy de las edge functions afectadas: `bewor-public-upload` (consume el shared).

### Notas para el usuario
Los dos PDFs son de 1 mes cada uno (febrero y marzo 2026) del **mismo titular** (Jesús Daniel Bailón Castro, IBAN BBVA terminado en 8241). La regla de **12 meses obligatorios** se mantiene — estos archivos servirán solo como entrenamiento del prompt, no como análisis válido si se suben tal cual.
