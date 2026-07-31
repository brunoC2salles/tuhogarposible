## 1. Agente: disponibilidad y estado activo

Página: **Mi Perfil** (`/agente/settings`, componente `AgentSettings.tsx`) — accesible desde el Portal del Agente. Ya contiene la tarjeta "Mi Disponibilidad" (editor tipo Calendly: días de la semana + franjas horarias, botón "Aplicar a todos", guardar).

Cambios:
- Añadir en la tarjeta "Mi Perfil" un switch **"Disponible para recibir leads"** que actualiza `profiles.activo` del propio usuario (las reglas de acceso ya permiten que cada usuario edite su propio perfil).
- Texto explicativo: si se desactiva, el reparto automático (round-robin) deja de asignarle leads nuevos.
- Añadir un enlace/botón visible **"Mi Perfil y Disponibilidad"** en el header del Portal del Agente para que los agentes lo encuentren fácil.

Dónde mostrárselo a los agentes: Portal del Agente → botón "Mi Perfil" (arriba a la derecha) → tarjeta "Mi Disponibilidad" (horarios) y switch "Disponible para recibir leads" en la tarjeta superior.

## 2. Admin de visitas: filtro por agente + leads con visitas

En `/admin/visitas`:
- El filtro por agente ya existe; se mantiene y se le añade opción "Sin asignar"/limpiar.
- Nueva sección **"Leads con visitas por agente"**: tabla agrupada que muestra, para el agente seleccionado (o para todos, agrupado por agente), cada lead con: nº de visitas, fecha de la última visita, si tiene reserva y acceso rápido a las URLs. Respeta el filtro de agente activo.
- La exportación CSV incluirá también este resumen por lead.

## 3. Buscador de leads al registrar visita (corrección)

Causa confirmada: `VisitFormModal` carga sólo **500 leads** ordenados alfabéticamente, mientras la base tiene **2.346 leads no descalificados** — todo lo que quede fuera de esos primeros 500 nombres es invisible. Además el filtrado es sólo en cliente y sensible a acentos.

Solución:
- Buscar en el servidor: al escribir (con debounce ~250 ms) consultar `leads` con `ilike` sobre nombre, teléfono y email, limitando a 30 resultados, en lugar de precargar una lista parcial.
- Normalizar acentos en el texto de búsqueda (coherente con el resto de la plataforma).
- Mantener el alcance por rol: el agente ve sólo sus leads; admin/supervisor ven todos.
- Mostrar en cada resultado nombre + teléfono + etapa, para distinguir homónimos, y estado "Escribe para buscar…" / "Sin resultados".

## Detalles técnicos
- `src/pages/AgentSettings.tsx`: switch de `activo` con actualización optimista y toast.
- `src/pages/inventario/AgenteInventario.tsx`: enlace al perfil.
- `src/components/visits/VisitFormModal.tsx`: búsqueda remota con debounce (sin límite fijo de 500).
- `src/pages/visitas/AdminVisitas.tsx`: agrupación por agente/lead a partir de `useLeadVisits({ scope: 'all' })`.
- Sin cambios de base de datos.
