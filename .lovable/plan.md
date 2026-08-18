# Prioridad alterna de leads para Jaime Fernández (solo hoy)

Objetivo: hoy (18/08/2026, hora de Madrid), de cada 2 leads que entren uno va a Jaime Fernández (jfernandez@tuhogarposible.com, agente activo) y el otro al reparto normal, hasta que él reciba 3 leads. Después vuelve el round-robin habitual automáticamente.

Resultado esperado: leads 1, 3, 5 para Jaime; leads 2, 4 para el resto. Al llegar a 3, o al pasar las 23:59 de hoy, el boost deja de aplicarse.

## Cómo funcionará

- Se reutiliza la tabla de "boost" ya existente, en modo alterno: se guarda cuántos leads le faltan (3) y si el próximo lead le toca a él o al reparto normal.
- Cuando entra un lead:
  - Si le toca a Jaime: se le asigna, se descuenta 1 y el turno pasa al reparto normal.
  - Si le toca al reparto normal: se asigna por round-robin como siempre y el turno vuelve a Jaime.
- Si Jaime deja de estar activo, el boost se ignora y todo sigue por round-robin.

## Detalles técnicos

1. Migración sobre `public.agent_assignment_boost`:
   - Eliminar boosts anteriores del mismo agente.
   - Insertar la fila del boost: `agent_id` de Jaime (`e97d13f9-1d76-44da-9e6e-e1699110caee`), `remaining = 3`, `mode = 'alternate'`, `next_is_boost = true`, `expires_at` = hoy 23:59 Europe/Madrid.

2. Edge function `get-next-agent`:
   - El modo `alternate` ya está implementado; no requiere cambios.
   - Logs: `[Boost/alternate] Turno agente: <nombre>, quedan N` y `[Boost/alternate] Turno round-robin`.

## Fuera de alcance

- No se crea interfaz de administración para gestionar boosts.
