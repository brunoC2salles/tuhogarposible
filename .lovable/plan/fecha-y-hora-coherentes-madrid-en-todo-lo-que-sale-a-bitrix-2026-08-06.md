# Fecha y hora coherentes (Madrid) en todo lo que sale a Bitrix y WhatsApp

## Qué encontré (verificado en base de datos y código)

De los 285 leads creados desde el 01/08/2026:

- **43 leads tienen `fecha_reunion`/`hora_reunion` pero `reunion_datetime` vacío.** Esos son el agujero real: cuando falta `reunion_datetime`, el trigger de la base de datos no se ejecuta (solo actúa cuando el campo no es nulo), así que ninguna de las protecciones que pusimos se aplica.
- **Los dos canales resuelven la fecha de forma distinta.** Bitrix recibe `lead_fecha_reunion_bitrix` construido solo con `fecha_reunion` + `hora_reunion` (fecha sin hora queda a las 00:00:00, y si no hay fecha va vacío). WhatsApp, en cambio, rellena por su cuenta 11:00 o "próximo día laborable a las 11:00". Resultado: el mismo lead llega a Bitrix a las 00:00 y a WhatsApp a las 11:00, o con días distintos.
- **Ningún canal comprueba que el instante sea futuro para Bitrix.** WhatsApp sí lo hace; Bitrix puede enviar una fecha ya pasada (hay 160 leads de agosto con reunión en el pasado).
- **Fallos puntuales del parser detectados en leads reales:** "07/08-12/00" quedó agendado el 06/08 (perdió el día), "06 /08 11'30" perdió los minutos, "4 de agosto 18 h 2026" quedó a las 18:20, y textos tipo "hoy", "6/8", "5/8/26 a las 12.30h." se quedaron sin `reunion_datetime`.

Lo que sí está bien: 0 reuniones fuera de la franja 08:00–20:00, 0 en fin de semana, y 0 desincronizaciones entre `reunion_datetime` y `fecha_reunion`/`hora_reunion` cuando el datetime existe.

## Qué voy a hacer

**1. Un único resolvedor de fecha/hora compartido**
Crear un helper común (en `supabase/functions/_shared/`) que, dado un lead, devuelva siempre un instante Madrid válido, en franja laboral, día hábil y futuro, con su equivalente ISO UTC y una bandera de "pendiente de confirmar". Bitrix y WhatsApp pasan a usar exactamente ese mismo resultado, así que nunca podrán diferir.

**2. Bitrix usa el resolvedor**
`lead_fecha_reunion_bitrix`, `lead_fecha_reunion`, `lead_hora_reunion` y `lead_reunion_datetime` se rellenan desde el resolvedor. Se acaban las fechas a las 00:00:00 y las fechas pasadas. `lead_reunion_a_definir` sigue indicando cuándo la hora es una asignación por defecto y no una elección del lead.

**3. El trigger de base de datos cubre también el caso nulo**
Ampliar `enforce_valid_reunion_datetime` para que, cuando llegue `fecha_reunion` sin `reunion_datetime` (o sin hora), complete la hora por defecto de las 11:00, aplique las mismas reglas de franja/día hábil/no solape y deje los tres campos sincronizados. Así ninguna vía de escritura puede volver a dejar un lead sin instante coherente.

**4. Correcciones del parser**
En `parseReunionDateTime.ts`: no perder el día cuando el separador entre fecha y hora es un guion ("07/08-12/00"), aceptar minutos escritos con apóstrofo o coma ("11'30", "12,30"), evitar que un año suelto se cuele como minutos ("18 h 2026"), y tratar fechas ya pasadas del año en curso empujándolas al siguiente día hábil manteniendo la hora pedida.

**5. Sin tocar datos históricos y sin reenvíos**
No se hace backfill de los 43 leads de agosto ni de ningún lead existente, y no se dispara nada a Bitrix ni a WhatsApp. Los cambios aplican solo a los leads que entren a partir de ahora (y a cualquier lead que se edite desde el CRM, gracias al trigger).

**6. Verificación**
Tras aplicar los cambios: ejecutar los tests del parser y comprobar con una consulta de control que los leads nuevos entran con día y hora coherentes en horario de Madrid (dentro de franja, día hábil, futuro, y con Bitrix y WhatsApp mostrando el mismo valor).

## Detalles técnicos

- Nuevo `_shared/resolveReunion.ts` con `madridToIso`, normalización a franja 08:00–20:00 L–V y garantía de futuro; consumido por `bitrixPayload.ts` y `secondaryQualifiedPayload.ts` (se elimina la lógica duplicada de `resolveScheduledAt`).
- Migración para reemplazar `public.enforce_valid_reunion_datetime()` incluyendo la rama `reunion_datetime IS NULL AND fecha_reunion IS NOT NULL`.
- Ajustes de regex en `_shared/parseReunionDateTime.ts` más casos nuevos en `parseReunionDateTime_test.ts`.
- No se ejecuta `fix-reunion-dates` ni ninguna corrección masiva de datos; sus salvaguardas se mantienen intactas.
