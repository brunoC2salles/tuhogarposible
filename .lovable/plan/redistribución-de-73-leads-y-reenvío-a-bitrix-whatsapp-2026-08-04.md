# Redistribución de 73 leads y reenvío a Bitrix + WhatsApp

## Alcance confirmado

- Conjunto: leads de **Pau Samblancat (65)** y **Jordi Aranda (8)** creados entre 01/06/2026 y 31/07/2026 con ahorros >= 5.000 € = **73 leads**.
- **16** pasan a **Gerardo Sanz**; los **57** restantes se reparten en partes iguales entre los demás agentes activos.
- Reagendado dentro de los **próximos 10 días hábiles** (05/08 a 18/08), respetando la hora de preferencia, no la fecha antigua.

## Agentes elegibles para los 57

Reparto ~7 leads por agente:

| Agente | Disponibilidad (Lun-Vie, Madrid) |
|---|---|
| JOSE ANTONIO | 09:00-20:00 |
| Manuel Torrecilla | 10:00-12:00 |
| Marie Colmenarez | 09:00-20:00 |
| Paula Bodega Sánchez | 08:00-11:00 y 18:00-20:00 |
| Solés Carabasa Closa | 16:00-20:00 (Mié y Jue desde 10:00) |
| Xavier Dalmau | 09:00-18:00 |
| Alejandro Bueno González | sin horario cargado: acepta cualquier hora |
| Ian Queralto | sin horario cargado: acepta cualquier hora |

Gerardo Sanz: Lun-Vie 10:00-18:00, recibe exactamente 16.

## Cómo se elige fecha y hora de cada lead

1. Hora deseada = hora de `reunion_datetime` actual si existe; si no, se traduce la preferencia textual: `mañana` -> 11:00, `mediodía` -> 14:00, `tarde` -> 17:00, sin preferencia -> 11:00.
2. Se descarta por completo la fecha antigua (incluida la fila con año 2926).
3. Se recorren los días hábiles del 05/08 al 18/08 y se asigna el primer par (día, hora) donde:
   - la hora cae dentro de la franja del agente para ese día de la semana;
   - el agente no tiene ya otra reunión en ese día y hora, contando tanto las reuniones existentes en la base como las que se van creando en esta misma redistribución.
4. Si la hora exacta no encaja en ninguna franja del agente, se desplaza a la hora válida más cercana dentro de su disponibilidad (mismo turno de mañana/tarde cuando sea posible).
5. Si un lead no logra encajar en ningún hueco, no se toca y se reporta al final.

## Ejecución

1. Consulta de los 73 leads con hora deseada calculada, y de todas las reuniones ya agendadas del 05/08 al 18/08 de todos los agentes.
2. Cálculo del reparto (16 Gerardo + 57 repartidos) y del calendario libre de solapes.
3. Actualización en base de datos de `agente_asignado_id`, `reunion_datetime`, `fecha_reunion` y `hora_reunion` de cada lead.
4. Reenvío de cada lead a **Bitrix** y al **webhook de WhatsApp** con los datos ya actualizados.
5. Informe final en el chat: tabla por agente con cantidad, rango de fechas, y listado de fallos de envío si los hubiera.

## Detalles técnicos

- Los updates se hacen con la herramienta de datos de Supabase (`UPDATE` sobre `leads`), en lotes por agente.
- El trigger `notify_lead_reassignment` generará notificaciones de reasignación para los agentes nuevos; `sync_lead_reunion_recordatorios` regenerará los recordatorios de 24 h y 1 h automáticamente al cambiar `reunion_datetime`.
- La acción `resend_lead_to_bitrix` de `make-webhook-proxy` hoy solo envía a Bitrix. Se amplía para que, tras el envío a Bitrix, llame también a `dispatchSecondaryQualified` (webhook WhatsApp), y se añade una acción `resend_leads_batch` que acepta una lista de `lead_id` y devuelve el resultado por lead.
- Se mantiene el guard `isLeadQualifiedForBitrix`: cualquier lead que no lo pase queda registrado como omitido en el informe.
- No se modifica la lógica de round-robin de `get-next-agent`; esta redistribución es una operación puntual.
