# Panel de métricas de asignación (round-robin)

Nueva página de administración `/admin/asignaciones` ("Reparto de Leads") que permite auditar, de un vistazo, que el round-robin reparte bien y que las fechas de reunión son coherentes.

## Contenido del panel

**Selector de ventana:** 24 h · 7 días · 30 días · rango personalizado. Cortes por día de calendario en Europe/Madrid.

**1. Asignaciones por agente**
- Tabla + gráfico de barras: leads asignados por agente en la ventana.
- Media, desviación respecto a la media y marca visual para agentes por encima/debajo de un umbral (por ejemplo ±30 %).
- Fila con agentes activos sin ningún lead en la ventana (señal de fallo de reparto).

**2. Detección de colisiones**
- Lista de casos donde un mismo agente tiene dos o más leads con `reunion_datetime` a menos de 30 minutos (misma regla que usa el asignador).
- Cada fila: agente, hora Madrid, leads implicados (nombre + enlace al lead), diferencia en minutos.
- Contador destacado: "0 colisiones" en verde, o número en rojo.

**3. Certificación de fechas de llamada**
Recuento y detalle de leads con reunión problemática dentro de la ventana:
- Fecha en el pasado respecto a la creación del lead (o fecha anterior a hoy con lead aún activo).
- Año fuera de rango (1969/1970, u otro año distinto del actual/siguiente).
- Fuera del horario laboral (antes de 09:00 o después de 20:00 Madrid).
- Fin de semana (sábado/domingo).
- Sin `reunion_datetime` pese a tener texto de preferencia horaria.
Todo se muestra convertido a hora de Madrid, junto al texto original (`hora_reunion_texto`) para poder comparar lo que dijo el lead con lo que se guardó.

**4. Resumen superior (KPIs)**
Leads asignados en la ventana · agentes activos que recibieron leads · colisiones · fechas problemáticas · % de leads con fecha válida.

Exportación CSV de las tablas de colisiones y fechas problemáticas.

## Detalles técnicos

- Página `src/pages/admin/AsignacionesMetrics.tsx` dentro de `AdminLayout`, ruta protegida solo-admin en `App.tsx`, entrada nueva en `AdminSidebar` (junto a "Dashboard Analítico").
- Hook `src/hooks/useAssignmentMetrics.ts`: una consulta a `leads` (id, nombre, agente_asignado_id, created_at, reunion_datetime, hora_reunion_texto, stage) filtrada por `created_at` en la ventana, más `profiles` de agentes activos. Se usa `fetchAllPaginated` para evitar el límite de 1000 filas.
- Todo el cálculo (agrupación, colisiones ±30 min, validación de fechas) se hace en cliente sobre esos datos; no hace falta migración ni tablas nuevas.
- Formateo de fechas con `Intl.DateTimeFormat` en `Europe/Madrid`, coherente con el resto del sistema.
- Gráfico con `recharts`, reutilizando el estilo de `AgentPerformanceChart` y tokens semánticos del design system.
- Solo lectura: el panel no reasigna ni modifica leads.
