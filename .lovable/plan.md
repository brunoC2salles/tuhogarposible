

## Cambio solicitado

Sustituir la regla actual **"ahorros mínimos = 5.000 €"** por una regla dinámica:

> **Ahorros mínimos = Valor del inmueble × % impuestos de la Comunidad Autónoma**

Esto significa que los ahorros del cliente deben cubrir, como mínimo, los impuestos de compraventa (ITP/IVA) de la CCAA donde se ubica el inmueble.

## Investigación previa necesaria

Antes de implementar necesito confirmar 3 cosas contigo:

### 1. Porcentajes de impuestos por CCAA

Los % de **ITP (vivienda usada)** varían por CCAA en España. Los oficiales 2025 son aproximadamente:

| CCAA | ITP general |
|---|---|
| Andalucía | 7% |
| Aragón | 8% (tramos hasta 10%) |
| Asturias | 8% (tramos hasta 10%) |
| Baleares | 8% (tramos hasta 13%) |
| Canarias | 6,5% |
| Cantabria | 9% |
| Castilla-La Mancha | 9% |
| Castilla y León | 8% (tramos hasta 10%) |
| Cataluña | 10% (tramos hasta 11%) |
| Ceuta | 6% |
| C. Madrid | 6% |
| C. Valenciana | 10% |
| Extremadura | 8% (tramos hasta 11%) |
| Galicia | 9% |
| La Rioja | 7% |
| Melilla | 6% |
| Murcia | 8% |
| Navarra* | 6% |
| País Vasco* | 4% |

*Navarra y País Vasco no están en `COMUNIDADES_AUTONOMAS` actualmente.

**Pregunta**: ¿Uso estos % oficiales o me pasas tu propia tabla? ¿Aplicamos solo el tramo general (más simple) o tramos por valor (más complejo)?

### 2. ¿Vivienda nueva (IVA 10%) vs usada (ITP)?

Si es **vivienda nueva**, en lugar de ITP se aplica **IVA 10% + AJD ~1,5%** (≈ 11,5% total). Hoy el simulador no pregunta esto.

**Pregunta**: ¿Asumimos siempre vivienda usada (ITP) o añadimos un toggle "Nueva/Usada" en el simulador?

### 3. ¿De dónde sacamos la CCAA en cada flujo?

- **Simulador hipotecario** (`SimuladorCreditoHipotecario.tsx`): ya tiene campo `comunidadAutonoma` ✅
- **Webhook Meta Ads** (`meta-lead-webhook`): el lead trae `comunidad_autonoma` o `provincia` (a confirmar en payload real)

**Pregunta**: Si en Meta Ads no viene la CCAA, ¿qué hacemos? Opciones: (a) usar un % medio de seguridad (8%), (b) saltar la regla y volver a 5.000 € fijos, (c) descalificar por falta de dato.

## Plan de implementación (post-aprobación)

Crear `src/lib/impuestosCCAA.ts` con tabla `ITP_POR_CCAA` + función `calcularAhorrosMinimos(valorInmueble, ccaa, tipoVivienda)`.

**Ficheros a tocar (3)**:
1. `src/lib/simuladorUtils.ts` — sustituir validación `ahorros < 5000` por `ahorros < calcularAhorrosMinimos(...)`. Mensaje de rechazo dinámico: "Ahorros insuficientes. Necesitas mín. X € (Y% de Z € en [CCAA])".
2. `supabase/functions/meta-lead-webhook/index.ts` — misma lógica en `qualificarLead()`. Si falta CCAA, aplicar fallback decidido en pregunta 3.
3. `src/lib/impuestosCCAA.ts` — NUEVO, fuente única de verdad.

**Memoria**: actualizar `mortgage-simulator-rules-2025` y `meta-ads-qualification-rules-2025`.

**No toco**: schema BD, UI del simulador (salvo si añades toggle nueva/usada), otras funciones.

## Reglas hipotecarias en vigor (en español, para tu referencia)

Una vez aprobado el cambio, las reglas quedarían así:

### Reglas generales del cálculo (sistema francés)
- **Tipo de interés**: TIN 1,6% primeros 10 años / TAE 1,72% / después Euribor + 0,35%
- **Tasa interna de cálculo**: 2,5% anual fija
- **Sistema de amortización**: francés (cuota mensual constante)
- **Plazo máximo**: 30 años
- **Edad máxima al final del préstamo**: 75 años (plazo se ajusta automáticamente)

### Mínimos obligatorios (rechazo automático si no se cumplen)
1. **Ahorros mínimos**: ~~5.000 €~~ → **Valor inmueble × % ITP de la CCAA** *(NUEVO)*
2. **Importe mínimo financiable**: 70.000 €
3. **Capacidad de pago disponible**: mín. 350 €/mes tras gastos y deudas

### Límites de financiación (LTV - Loan To Value)
- **Funcionarios públicos**: hasta 100% del valor
- **Vivienda habitual con DNI/NIE residente**: hasta 90%
- **No residentes / 2ª vivienda**: hasta 70%
- **Inversión / alquiler**: hasta 50%

### Hipoteca máxima absoluta
- **1 titular**: 180.000 €
- **2+ titulares**: 210.000 €

### Capacidad de endeudamiento (DTI)
- La cuota mensual no puede superar el **35%** de los ingresos netos mensuales después de descontar las deudas existentes
- Fórmula: `cuota_máx = (ingresos_netos − deudas_mensuales) × 0,35`

### Orden de prioridad de los motivos de rechazo
1. Ahorros insuficientes (nueva regla dinámica)
2. Importe solicitado < 70.000 €
3. Capacidad < 350 €/mes
4. Hipoteca solicitada > tope absoluto (180k/210k)
5. Cuota calculada > 35% disponible

### Descuentos aplicables (no afectan al cálculo de aprobación, sí al coste)
- Familia numerosa
- Menores de 35 años

## Preguntas que necesito responder antes de codificar

