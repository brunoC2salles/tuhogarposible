# Sistema de Visitas de Leads

Registro de solicitudes de visita hechas por los agentes a sus leads calificados, con tracking por agente/lead/semana/mes y panel admin.

## 1. Base de datos

Nueva tabla `lead_visits`:
- `lead_id` (FK a `leads`)
- `agente_id` (FK a `profiles`) — se autocompleta con `auth.uid()` al crear
- `fecha_visita` (timestamptz)
- `product_urls` (text[]) — lista editable de URLs
- `tiene_reserva` (bool)
- `reserva_url` (text, nullable) — solo si `tiene_reserva=true`; debe ser una de las `product_urls`
- `notas` (text, opcional)
- `created_at`, `updated_at`

Reglas de acceso:
- Agente: puede ver / crear / editar / eliminar sus propias visitas.
- Supervisor: puede ver todas.
- Admin: puede ver, crear, editar y eliminar todas.

GRANTs a `authenticated` y `service_role`. Trigger `updated_at`. Índices en `agente_id`, `lead_id`, `fecha_visita`.

## 2. UI del agente

**Página nueva `/agente/visitas`** (link en header del portal del agente):
- Listado con filtros: rango de fechas, lead, con/sin reserva.
- Contadores rápidos: visitas esta semana, este mes, total con reserva.
- Botón "Registrar visita" → abre modal.
- Cada fila: fecha, lead, nº de URLs, badge de reserva, acciones editar/eliminar.

**Modal registrar/editar visita**:
- Combobox de lead: búsqueda por nombre en leads calificados del agente (excluye `descualificados`).
- Date/time picker (`fecha_visita`).
- Lista dinámica de URLs con botones "+ Añadir URL" y eliminar por fila; validación de formato URL.
- Switch "¿Hubo reserva?" → si activo, aparece un `Select` con las URLs añadidas para marcar cuál se reservó.
- Notas opcional.

**Acceso rápido desde `LeadDetailsModal`**: nueva pestaña "Visitas" que muestra las visitas de ese lead y permite crear una nueva pre-seleccionando el lead.

## 3. UI admin

**Página `/admin/visitas`** (link en sidebar admin):
- Mismo listado pero con todos los agentes.
- Filtros extra: agente, lead.
- KPIs: visitas por semana / mes, reservas / conversión, top agentes, top leads.
- Gráfico de barras semanal + mensual (recharts, ya usado en el proyecto).
- Editar/eliminar cualquier visita.
- Export CSV.

Supervisor reutiliza la misma página (solo lectura).

## 4. Hook y tipos

- `src/types/visits.ts` con `LeadVisit`, `LeadVisitFormData`.
- `src/hooks/useLeadVisits.ts` con list (filtros opcionales), create, update, delete, y agregados semana/mes.

## Detalles técnicos

- Stack existente: React + shadcn + Supabase. Sin edge functions nuevas.
- Combobox reutiliza patrón de `CiudadCombobox`.
- Date picker: shadcn Datepicker (`pointer-events-auto` en Calendar dentro de Dialog).
- Validación con `zod` en el modal.
- `agente_id` se setea server-side vía default `auth.uid()` o desde el hook usando el usuario autenticado; RLS bloquea suplantación.
- Rutas nuevas registradas en `src/App.tsx` bajo `ProtectedRoute` con el rol correspondiente.
- No se toca lógica de qualification/webhooks/asignación.
