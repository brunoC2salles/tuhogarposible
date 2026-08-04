# Revisión de agendas de agosto y corrección del parser de horarios

## Qué se verificó

Los **73 leads redistribuidos** están correctos: todos entre el 05/08 y el 18/08/2026, en días hábiles, entre las 09:00 y las 19:00 (Europe/Madrid), sin solapes, y con `fecha_reunion`/`hora_reunion` coherentes con `reunion_datetime`. No hay nada que corregir ahí.

El problema está en los **leads nuevos que entraron del 01/08 en adelante** (182 con reunión). El parser de texto libre está confundiendo el **día con la hora**:

| Texto del lead | Agendado ahora | Debería ser |
|---|---|---|
| `3/8` | 03/08 a las 03:00 | 03/08, hora a definir |
| `05/08/2026` | 05/08 a las 05:00 | 05/08, hora a definir |
| `Lunes 3 8 hra 5 pm` | 03/08 a las 03:00 | 03/08 a las 17:00 |
| `03 08 11` | 03/08 a las 03:00 | 03/08 a las 11:00 |
| `8 de agosto` | 03/08 a las 08:00 | 10/08 (lunes), hora a definir |
| `14 /08/26` | 03/08 a las 14:00 | 14/08, hora a definir |
| `18.3` | 18/03/**2027** | fuera de horizonte, usar fallback |
| `después de las 6` | 04/08 a las 06:00 | 04/08 a las 18:00 |

Resumen de los 182: 83 con fecha ya pasada, 32 con hora de madrugada, 7 con fecha lejana (hasta 2036), sólo 60 coherentes. De ellos, 17 son leads cualificados/activos y 13 de esos 17 están mal agendados.

## Correcciones al parser (`parseReunionDateTime`)

1. **Eliminar del texto la fecha ya detectada antes de buscar la hora.** Es la causa raíz de los `03:00`, `05:00`, `14:00` falsos.
2. **Soportar meses por nombre**: "8 de agosto", "3 de agosto por la mañana", "10 de septiembre".
3. **Interpretar franjas con número**: "5 pm" → 17:00, "después de las 6" → 18:00, "sobre las 2.30 P.M" → 14:30.
4. **Rango horario laboral**: cualquier hora resultante fuera de 08:00–20:00 se ajusta al límite más cercano dentro de ese rango (o queda como "a definir" si es claramente absurda).
5. **Horizonte máximo**: si la fecha calculada cae a más de 90 días vista (casos `18.3` → 2027, o el 2036), se descarta y se usa el siguiente día hábil a las 11:00.
6. **Sin hora fiable** → `hora = null` y `confidence = 'pending_time'`, como ya define la política actual, en vez de inventar una hora de madrugada.
7. Ampliar `parseReunionDateTime_test.ts` con todos los casos reales de la tabla de arriba.

## Corrección de los datos ya guardados

1. Re-parsear con la lógica corregida el `hora_reunion_texto` de los leads creados desde el 01/08 con reunión incoherente (fecha pasada, hora fuera de 08:00–20:00, fin de semana o fecha a más de 90 días).
2. Reagendar cada uno respetando la disponibilidad de su agente y sin solapar con reuniones existentes, dentro de los próximos días hábiles de agosto.
3. Los leads **descualificados** (la gran mayoría) sólo se corrigen en base de datos; no se reenvía nada.
4. Los **leads cualificados/activos** afectados (13) se reenvían a Bitrix y al webhook de WhatsApp con `resend_leads_batch` una vez corregida su fecha.
5. Informe final con la lista de leads corregidos, su fecha anterior y la nueva.

## Detalles técnicos

- Cambios en `supabase/functions/_shared/parseReunionDateTime.ts` y sus tests; redeploy de `meta-lead-webhook`, `tally-housage-webhook` y `reprocess-meta-leads`.
- El reagendado en base de datos se hace con la herramienta de datos (`UPDATE` sobre `leads`), actualizando `reunion_datetime`, `fecha_reunion` y `hora_reunion` de forma consistente. El trigger `sync_lead_reunion_recordatorios` regenerará los recordatorios de 24 h y 1 h automáticamente.
- Los reenvíos pasan por el guard `isLeadQualifiedForBitrix`, así que ningún descualificado saldrá al exterior.
