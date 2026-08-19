# Auditoría del round-robin y de las fechas de reunión

## Lo que verifiqué en los datos reales

**Round-robin: funciona correctamente.** Reparto de los leads asignados en los últimos 7 días:

| Agente | Leads |
|---|---|
| Alejandro Bueno, Manuel Torrecilla, Paula Bodega, Jaime Fernández, Ian Queralto, Gerardo Sanz, Oscar Tirado, Solés Carabasa, Xavier Dalmau | 4 cada uno |
| Miki Sánchez, Marie Colmenarez | 3 cada uno |

**Un lead por agente y franja: se cumple.** Buscando agentes con dos leads en el mismo `reunion_datetime` en los últimos 10 días sólo aparece 1 caso (10/08 09:00 UTC, dos leads del mismo agente), procedente de la redistribución masiva por lote de agosto, anterior al guard de colisiones. Ningún lead nuevo ha colisionado.

**Las fechas sí tienen fallos.** Ejemplos reales de los últimos días:

| Texto del lead | Se guardó | Debería ser |
|---|---|---|
| `19082026` | 20/08 11:00 (fallback) | 19/08 |
| `24` | 20/08 11:00 (fallback) | 24/08 |
| `15.12.2026` | 20/08 11:00 (fallback) | 15/12/2026 |
| `21/08 11/12` | 21/08 a las 11:12 | 21/08 a las 11:00 |
| `18/08,2026 ,12h Canarias` | 18/08 12:00 Madrid | 18/08 13:00 Madrid |

El formato de salida sí es coherente: `fecha_reunion`, `hora_reunion` y `reunion_datetime` cuadran entre sí en todos los casos revisados, y `resolveReunion` entrega el mismo día/hora a Bitrix y a WhatsApp.

## Correcciones propuestas al parser

1. **Fechas compactas** `19082026` / `190826` / `1908`: reconocer `ddmmaaaa`, `ddmmaa` y `ddmm` cuando no hay separadores.
2. **Sólo día del mes** (`24`, `día 24`): si el número está entre 1 y 31 y no hay ninguna otra pista de hora, tratarlo como día del mes en curso (o del siguiente si ya pasó), con `hora = null` (pendiente de confirmar), en vez de caer al fallback genérico.
3. **Horizonte de 90 días**: ampliarlo a 180 días para no descartar peticiones legítimas a varios meses vista como `15.12.2026`.
4. **Rangos horarios con barra** (`11/12`, `16/18`): interpretarlos como franja y quedarse con la hora de inicio, no con `hh:mm`. Se mantiene `12/00` y `16/30` como hora exacta cuando el segundo número no puede ser una hora válida de fin.
5. **Zona horaria de Canarias**: si el texto menciona Canarias / Tenerife / Las Palmas / Gran Canaria, sumar 1 hora para convertir a hora peninsular antes de guardar.
6. Ampliar `parseReunionDateTime_test.ts` con todos los casos de la tabla de arriba.

## Refuerzo del anti-solape (opcional, incluido)

El guard actual de `get-next-agent` excluye a un agente sólo si ya tiene un lead en ±1 minuto del mismo instante. Lo amplío a una ventana de **±30 minutos**, que es la duración real de una reunión, para que dos leads a las 11:00 y 11:15 no caigan en el mismo agente.

## Alcance

- Sólo se corrige la lógica hacia adelante. **No se reenvía nada a Bitrix ni a WhatsApp** y no se reescriben leads antiguos, salvo que lo pidas después.

## Detalles técnicos

- `supabase/functions/_shared/parseReunionDateTime.ts` (extracción de fecha/hora, `MAX_HORIZON_DAYS`, nuevo ajuste de Canarias) y su fichero de tests.
- `supabase/functions/get-next-agent/index.ts`: ventana de conflicto de ±1 min a ±30 min.
- Redeploy de `meta-lead-webhook`, `tally-housage-webhook`, `reprocess-meta-leads` y `get-next-agent`.
- Sin cambios en base de datos.
