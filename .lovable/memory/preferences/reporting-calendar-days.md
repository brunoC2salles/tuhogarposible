---
name: Reporting — cortes por días de calendario
description: Todos los informes de leads usan días de calendario en Europe/Madrid, nunca ventanas móviles
type: preference
---

**Regla:** Cuando el usuario pide un informe de leads de "hoy", "ayer", "últimos N días" o "últimas horas", SIEMPRE usar cortes por **día de calendario en zona `Europe/Madrid`**, no ventanas móviles (rolling 24h/48h/72h).

**Por qué:** El 17/07/2026 entregué un informe "últimas 48h = 22 cualificados" usando `now() - interval '48 hours'`. El usuario contaba "ontem + hoje" por calendario y solo veía 11 en Bitrix. Los dos números eran técnicamente correctos pero **no comparables**, y generó desconfianza sobre si el webhook Bitrix estaba fallando (no estaba).

**Cómo aplicar:**
- SQL: `WHERE (created_at AT TIME ZONE 'Europe/Madrid')::date >= (now() AT TIME ZONE 'Europe/Madrid')::date - N`
- Agrupar y presentar por columna `dia` (fecha), nunca por bucket de horas.
- "Últimos 2 días" = ayer + hoy (2 filas). "Últimos 7 días" = 7 filas.
- Si por algún motivo se necesita una ventana móvil, decirlo explícitamente en el informe ("ventana móvil de 48h desde HH:mm").
- Cruzar SIEMPRE los cualificados del CRM con `webhook_logs` (status='success') para validar que Bitrix recibió lo esperado antes de entregar el informe.
