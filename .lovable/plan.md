

# Plan: corregir definitivamente los 4 valores que llegan a Bitrix desde Meta Ads

## Diagnóstico del problema actual

Inspeccionando `meta-lead-webhook/index.ts`, los 4 campos que recibes en Make están así hoy:

| Variable Make | Mapeo actual | Problema |
|---|---|---|
| `sim_hipoteca_monto_financiable` | `simulacionHipotecaria.monto_maximo_financiable` | ✅ correcto (con cap 180k) |
| `sim_hipoteca_valor_max_inmueble` | `simulacionHipotecaria.valor_maximo_inmueble` (= monto / 0,90) | ⚠️ **es el techo bruto por ingresos, no el precio recomendado** (no aplica el tope por ahorros del Punto 1) |
| `sim_hipoteca_cuota_maxima` | `simulacionHipotecaria.cuota_maxima_mensual` (= `(ingresos - deudas) × 0,35`) | ⚠️ **es la capacidad teórica, no la cuota real** de la hipoteca aprobada |
| `sim_personal_monto_maximo` | `simulacionPersonal.monto_maximo` (con cap 15k) | ⚠️ **el código tiene `Math.min(montoTeorico, 15000)`, así que en código está bien**. Si recibiste 36k es porque el lead se procesó con código antiguo o el payload se cacheó en Make. Hay que verificar tras el deploy. |

Y la cuota del personal (`sim_personal_cuota_mensual`) sí existe pero **no la tienes mapeada en tu plantilla de Make**. Por eso te falta el dato.

## Las 4 correcciones a aplicar (1 solo archivo)

### Archivo: `supabase/functions/meta-lead-webhook/index.ts`

**Corrección 1 — `sim_hipoteca_valor_max_inmueble` ahora apunta al precio recomendado real**

Cambiar el mapeo del payload Bitrix (línea 1164) para que use el `MIN(P1, P2)` que ya calculamos, en lugar del techo crudo por ingresos:

```
sim_hipoteca_valor_max_inmueble: precioMaxInmueble.precio_max_recomendado
```

Así el "Maximo Financiable" en Bitrix coincide con lo que el simulador del agente muestra en pantalla y respeta el tope por ahorros (Punto 1).

**Corrección 2 — `sim_hipoteca_cuota_maxima` ahora envía la cuota real mensual**

Cambiar el mapeo (línea 1165) para enviar la cuota mensual real de la hipoteca aprobada, no la capacidad teórica:

```
sim_hipoteca_cuota_maxima: simulacionHipotecaria.cuota_mensual_real
```

(Esto es lo que confirmaste: "Cuota real" en la pregunta.)

**Corrección 3 — Garantizar tope duro 15.000€ en `sim_personal_monto_maximo` (refuerzo defensivo)**

En `calcularSimulacionPersonal` (líneas 545-571), añadir un `Math.min` explícito y un log para garantizar que **nunca** salga un valor > 15.000€, pase lo que pase:

```
const montoMaximo = Math.min(Math.max(montoTeorico, 0), CP_TOPE);
console.log('[CP] teorico:', montoTeorico, '→ aplicado tope 15k:', montoMaximo);
```

Y reforzar el tope justo antes del payload (línea 1153) con un `Math.min(simulacionPersonal.monto_maximo, 15000)` como cinturón + tirantes. Si te llegó 36k es porque algo se ejecutó antes del deploy anterior — esto blinda el campo de raíz.

**Corrección 4 — Asegurar que `sim_personal_cuota_mensual` lleva la cuota correcta**

El campo ya existe en el payload (línea 1155) y ya calcula bien (~234€/mes cuando bate en el tope). Solo necesitas **añadir el mapeo en tu plantilla de Make** así:

```
Crédito personal cuota mensual: €{{3.sim_personal_cuota_mensual}}
```

## Resumen de los 4 valores que recibirás (verificación mental con un lead real)

Lead: ingresos 2.500€ · deudas 200€ · ahorros 10.000€ · 35 años · Madrid

| Variable Bitrix | Valor que llegará | Fórmula |
|---|---|---|
| `sim_hipoteca_monto_financiable` | **180.000€** | min(teórico, cap 180k) |
| `sim_hipoteca_valor_max_inmueble` | **200.000€** | MIN(P1=208.333; P2=200.000) |
| `sim_hipoteca_cuota_maxima` | **~711€** | cuota real francesa de 180k a 30 años, 2,5% |
| `sim_personal_monto_maximo` | **15.000€** | tope duro |
| `sim_personal_cuota_mensual` | **~234€** | cuota real de 15k a 84 meses, 8% |

## Lo que NO se toca (importantísimo para no romper Make)

- ❌ Los nombres de las variables planas: **idénticos**. Tu plantilla de Make sigue funcionando sin cambios.
- ❌ Todos los demás campos que ya usas (`lead_nombre`, `lead_telefono`, `lead_edad`, `meta_monto_ahorros`, `meta_antiguedad_trabajo`, etc.): **intactos**.
- ❌ Campos extra nuevos (`sim_hipoteca_precio_max_por_ahorros`, `pago_combinado_mensual_aprox`, `poder_compra_total`, etc.): **se mantienen** como confirmaste, por si quieres mapearlos más adelante. No molestan.
- ❌ Webhook de descualificados, asignación de agente, recomendaciones de inmuebles, fórmulas de cualificación: **intactos**.
- ❌ Simulador del front, CRM, PDF, `make-webhook-proxy`: **intactos**.
- ❌ Base de datos: **cero migraciones**.

## Detalles técnicos

- 1 solo archivo modificado, ~6 líneas reales cambiadas + 2 logs defensivos.
- Deploy automático al guardar.
- **Reversibilidad total**: si algo sale mal, revertimos en 30 segundos.
- **Sin impacto de performance**: cero llamadas extra, cero queries nuevas.
- **Retro-compatibilidad 100%** con tu plantilla de Make actual.

## Validación post-deploy

1. Disparas el botón **"Probar con Último Lead"** desde Admin Settings.
2. Revisas el log de `webhook_logs` o el run de Make para ver el payload recibido.
3. Confirmas que los 4 valores cuadran con lo que el simulador del agente muestra en el CRM para ese mismo lead.
4. Si todo bien, añades la línea `Crédito personal cuota mensual: €{{3.sim_personal_cuota_mensual}}` en tu plantilla de Bitrix.

