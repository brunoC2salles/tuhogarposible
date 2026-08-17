# Prioridad alterna de leads para Jaime Fernández (solo hoy)

Objetivo: hoy (17/08/2026, hora de Madrid), de cada 2 leads que entren uno va a Jaime Fernández (jfernandez@tuhogarposible.com, agente activo) y el otro al reparto normal, hasta que él reciba 5 leads. Después vuelve el round-robin habitual automáticamente.

Resultado esperado: leads 1, 3, 5, 7, 9 para Jaime; leads 2, 4, 6, 8 para el resto. Al llegar a 5, o al pasar las 23:59 de hoy, el boost deja de aplicarse.

## Cómo funcionará

- Se reutiliza la tabla de "boost" ya existente, añadiéndole un modo alterno: se guarda cuántos leads le faltan (5) y si el próximo lead le toca a él o al reparto normal.
- Cuando entra un lead:
  - Si le toca a Jaime: se le asigna, se descuenta 1 y el turno pasa al reparto normal.
  - Si le toca al reparto normal: se asigna por round-robin como siempre y el turno vuelve a Jaime.
- Si Jaime deja de estar activo, el boost se ignora y todo sigue por round-robin.

## Detalles técnicos

1. Migración sobre `public.agent_assignment_boost`:
   - Nuevas columnas: `mode text not null default 'consecutive'` y `next_is_boost boolean not null default true`.
   - Insertar la fila del boost: `agent_id` de Jaime (`e97d13f9-1d76-44da-9e6e-e1699110caee`), `remaining = 5`, `mode = 'alternate'`, `next_is_boost = true`, `expires_at` = hoy 23:59 Europe/Madrid.

2. Edge function `get-next-agent`:
   - Al leer el boost activo (`remaining > 0 AND expires_at > now()`):
     - `mode = 'alternate'` y `next_is_boost = false`: no se asigna al agente del boost; solo se marca `next_is_boost = true` y se continúa con el round-robin normal.
     - `mode = 'alternate'` y `next_is_boost = true`: se asigna a Jaime, `remaining - 1` y `next_is_boost = false` (actualización condicionada al valor leído, para evitar carreras).
   - El comportamiento actual (`consecutive`) se mantiene igual para no romper boosts previos.
   - Logs: `[Boost/alternate] Turno agente: <nombre>, quedan N` y `[Boost/alternate] Turno round-robin`.

## Fuera de alcance

- No se crea interfaz de administración para gestionar boosts.
