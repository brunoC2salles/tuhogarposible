
# Plan: nueva disponibilidad tipo Calendly + limpieza de campos

## 1. Base de datos (una migración)

**Eliminar columnas de `profiles`:**
- `tidycal_url`, `dni_nie`, `comision_porcentaje`, `region_round_robin`, `disponibilidad` (turnos viejos)

**Nueva tabla `agent_availability`:**
- `id`, `agent_id` (FK profiles), `weekday` (0-6, 0=lunes), `start_time` (time), `end_time` (time), `created_at`, `updated_at`
- Índice por `agent_id`
- Permite múltiples filas por día → mismo agente puede tener Lunes 09:00-13:00 y Lunes 18:00-20:00
- RLS: agente ve/edita las suyas; admin ve/edita todas
- GRANTs correspondientes

**Limpieza:**
- Vaciar `agent_assignment_tracking` y renombrar semánticamente: ahora solo existe una única fila con `region='global'` (no dropeamos la tabla para preservar el patrón round-robin actual)
- Drop de columnas relacionadas con `comision_porcentaje` en `agent_variable_costs` **NO** se toca (es un campo de coste por factura, no del perfil)

## 2. Edge function `get-next-agent`

Reescribir la lógica:

1. Recibe `{ reunion_datetime: ISO | null }` en vez de `region`/`turnoOverride`
2. Convertir `reunion_datetime` a Europe/Madrid → obtener `weekday` + `hh:mm`
3. Traer todos los agentes activos (excepto Housage)
4. **Caso A — reunión concreta:** filtrar agentes con franja que cubra ese día+hora. Si hay ≥1, round-robin normal entre ellos
5. **Caso B — reunión concreta pero nadie disponible exactamente:** para cada agente calcular "distancia mínima" entre sus franjas y el horario pedido; ordenar por distancia ascendente y aplicar round-robin sobre el grupo con la distancia más cercana (empatados)
6. **Caso C — `reunion_datetime` null (a definir):** round-robin global entre todos los agentes activos, ignorando disponibilidad
7. Tracking sigue en `agent_assignment_tracking` con `region='global'` (un único cursor)

## 3. UI Agent — `src/pages/AgentSettings.tsx`

Rehacer el formulario:
- Quitar: campos Tidycal, regiones (bloque completo), turnos viejos
- Mantener: nombre, teléfono
- Añadir: grid semanal (Lun-Dom) con lista de franjas por día
  - Botón "+ Añadir franja" por día → inputs `start` / `end` (type=time) + botón eliminar
  - Guardado atómico: `DELETE all my rows` + `INSERT` nuevas dentro de una llamada
- Validación cliente: `end > start`, sin solapamientos en el mismo día

## 4. UI Admin — `src/pages/AdminAgentes.tsx` y `AgenteDetails.tsx`

- Quitar columnas/campos Tidycal, DNI, comisión, regiones y turnos
- Añadir sección "Disponibilidad" (solo lectura resumida en lista; misma UI de edición en detalle si el admin edita)
- Ajustar hook `useAgentes.ts`: quitar `dni_nie`, `comision_porcentaje` del select

## 5. Ajustes en flujos que leen esos campos

- `AuthContext.tsx`: quitar referencias a los 5 campos
- `useProductInvoices.ts`, `ControleFinanceiro.tsx`, `SupervisorFinanceiro.tsx`: usan `comision_porcentaje` para cálculos de facturas → **CONFIRMAR con el usuario antes de tocar** (ver "Duda abierta")
- `bitrixPayload.ts`, `secondaryQualifiedPayload.ts`, `meta-lead-webhook`, `reprocess-meta-leads`, `make-webhook-proxy`: eliminar `tidycal_url` del payload del agente; la llamada a `get-next-agent` pasa a enviar `reunion_datetime` en lugar de `region`/`turnoOverride`
- `useLeadDocumentChecklist.ts`: uso probablemente colisión de nombre `disponibilidad` — verificar y no tocar si no aplica

## 6. Regenerar types y probar

- Types se regeneran solos tras migración
- Verificar TypeScript build limpio
- Probar en preview: agente crea franjas, admin ve, se dispara lead simulado

---

## Duda abierta — necesito confirmar antes de implementar

Los campos `dni_nie` y `comision_porcentaje` de `profiles` **se usan actualmente** en el módulo de facturación:
- `useProductInvoices.ts` y `ControleFinanceiro.tsx` calculan comisiones del agente con `comision_porcentaje`
- Facturas PDF pueden mostrar el DNI del agente

**¿Confirmas que quieres eliminarlos igualmente?** Si sí, el cálculo de comisiones pasaría a usar un valor fijo (¿cuál?) o desaparecería. Prefiero preguntar antes que romper la facturación.

## Archivos técnicos afectados

- Migración: `supabase/migrations/<timestamp>_agent_availability.sql`
- Edge functions: `get-next-agent`, `meta-lead-webhook`, `reprocess-meta-leads`, `make-webhook-proxy`, `_shared/bitrixPayload.ts`, `_shared/secondaryQualifiedPayload.ts`
- Frontend: `AgentSettings.tsx`, `AdminAgentes.tsx`, `AgenteDetails.tsx`, `AuthContext.tsx`, `useAgentes.ts`
- Nuevo hook: `useAgentAvailability.ts`
