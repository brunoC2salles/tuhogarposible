

# Plan: Precio Máximo de Inmueble (Punto 1 + Punto 2)

## Resumen del cambio

Añadir el cálculo del **Precio Máximo de Inmueble Recomendado** combinando dos topes y mostrarlo en el simulador, en el card del CRM, en las recomendaciones inline y en el webhook a Bitrix.

## Fórmulas confirmadas

**Punto 1 — Tope por ahorros (crédito personal apalancado):**
```
CPmax = (15.000 + Ahorros) / 2
% Comunidad = ITP de la CCAA con descuentos (familia numerosa 50%, <35 años 10%)
PrecioMax_P1 = CPmax / % Comunidad
```

**Punto 2 — Tope por ingresos (hipoteca):**  
Es el `montoMaximoFinanciable` que ya calculamos hoy (cuota máx 35% × factor francés, capado a 180k/210k según titulares), reconvertido a precio de inmueble dividiendo por el % de financiación aplicable.
```
PrecioMax_P2 = montoMaximoFinanciable / (porcentajeFinanciamiento / 100)
```

**Resultado final (lógica del briefing = MIN):**
```
PrecioMaximoInmueble = MIN(PrecioMax_P1, PrecioMax_P2)
```

## Qué se construye

### 1. Lógica central — `src/lib/simuladorUtils.ts`
- Nueva función pura `calcularPrecioMaximoInmueble({ ahorros, comunidad, familiaNumerosa, menorDe35, montoMaximoFinanciable, porcentajeFinanciamiento })` que devuelve `{ precioMaxP1, precioMaxP2, precioMaximoInmueble, cpMax, tasaAplicada }`.
- Reusa `getTasaITP()` que ya existe (con descuentos). Sin tocar otras fórmulas.
- Añadir 4 campos al `ResultadosSimulacionHipoteca`: `precioMaximoInmueble`, `precioMaxPorAhorros` (P1), `precioMaxPorIngresos` (P2), `creditoPersonalMaximo` (CPmax). Todos opcionales en el tipo para no romper nada.
- Llamada al final de `calcularSimulacionHipoteca` (1 línea), antes del `return`.

### 2. Simulador — `ResultadosSimulacionHipotecaria.tsx`
- Nueva tarjeta destacada **"Precio Máximo de Inmueble Recomendado"** mostrando el valor final + desglose pequeño de los 2 topes y cuál mandó.
- Solo se muestra si `aprobable === true` (no tiene sentido recomendar precio si no se aprueba).

### 3. Persistencia en el lead
- Al guardar la simulación en `leads.simulador_hipotecario_data` (jsonb existente, sin migración), añadir las 4 nuevas claves: `precio_maximo_inmueble`, `precio_max_por_ahorros`, `precio_max_por_ingresos`, `credito_personal_maximo`.
- Revisar `useLeads.ts` / lugar donde se guarda la simulación para incluir los nuevos campos en el objeto persistido.

### 4. Card del CRM — `src/components/crm/LeadCard.tsx`
- Añadir línea pequeña debajo de los ingresos: `🎯 Hasta {precio_maximo_inmueble}` cuando exista en `simulador_hipotecario_data`. Sin emoji (regla de proyecto), solo texto + icono Lucide `Target`.

### 5. Recomendaciones inline — `LeadDetailsModal` (tab Inmuebles)
- En el filtrado de inmuebles ya existente, sustituir el actual `valor_maximo_inmueble × 1,35` por el nuevo `precio_maximo_inmueble × 1,1` (margen del 10% para no esconder ofertas justo por encima).
- Si no existe el nuevo campo, fallback al cálculo actual (retro-compatibilidad con leads antiguos).

### 6. Webhook Bitrix — `supabase/functions/make-webhook-proxy/index.ts`
- Añadir 4 campos planos al payload `send_lead_assignment` y al de actualización:
  - `sim_hipoteca_precio_max_inmueble`
  - `sim_hipoteca_precio_max_por_ahorros`
  - `sim_hipoteca_precio_max_por_ingresos`
  - `sim_hipoteca_credito_personal_max`
- Mantener los existentes (`sim_hipoteca_valor_max_inmueble`) para no romper Make.com.

### 7. PDF del simulador — `src/lib/pdfGenerator.ts`
- En la fila "Precio máximo de vivienda*" sustituir el cálculo actual por el nuevo `precioMaximoInmueble` cuando exista. Una línea cambiada.

## Lo que NO se toca

- ❌ Webhook Meta Ads (`meta-lead-webhook`): mantiene su lógica simplificada porque no tiene precio confirmado del inmueble. Sin cambios.
- ❌ Reglas de aprobación (35% DTI, 70k mínimo, 350€/mes, topes 180k/210k, ITP dinámico de ahorros mínimos): intactas.
- ❌ Tabla `impuestosCCAA.ts`: intacta.
- ❌ Schema de la BD: cero migraciones (todo cabe en el jsonb existente).
- ❌ Bewor / lector de extractos: pospuesto como pediste.

## Detalles técnicos

- **Performance**: 1 multiplicación + 1 división extra por simulación. Impacto cero.
- **Retro-compatibilidad**: leads antiguos sin los nuevos campos siguen funcionando (fallbacks en CRM y recomendaciones).
- **Edge cases manejados**:
  - Ahorros = 0 → CPmax = 7.500 → precio max P1 ≈ 75.000-185.000 según CCAA
  - `porcentajeFinanciamiento = 0` (contrato temporal) → P2 = 0 → no aprobable, no se muestra
  - CCAA desconocida → usa fallback 8% de la tabla
- **Validación numérica**: redondeo a entero con `Math.round` y guard `Math.max(0, ...)` para evitar negativos.

## Ejemplo de cálculo (verificación mental)

- Ahorros: 20.000€ · CCAA: Madrid (6%, sin descuentos) · Ingresos: 2.500€/mes · 1 titular · indefinido
- CPmax = (15.000 + 20.000) / 2 = **17.500€**
- PrecioMax_P1 = 17.500 / 0,06 = **291.666€**
- Cuota máx = 2.500 × 0,35 = 875€/mes → hipoteca máx (30 años, 2,5%) ≈ 221.500€ → cap 180k → **180.000€**
- PrecioMax_P2 = 180.000 / 0,90 = **200.000€**
- **PrecioMaximoInmueble = MIN(291.666 ; 200.000) = 200.000€** ✅

## Entrega

Una sola entrega, sin migraciones de BD. Después comparamos en preview con un lead real antes de tocar el webhook de producción.

