# Prioridad temporal de leads para Miki Sánchez

Objetivo: que hoy (11/08/2026, hora de Madrid) los próximos 3 leads que entren se asignen a Miki Sánchez Martínez (msanchez@tuhogarposible.com), y que después el reparto vuelva al round-robin normal automáticamente.

## Cómo funcionará

- Se crea un "boost" con: agente, número de leads restantes (3) y fecha de caducidad (hoy a las 23:59 Madrid).
- Cuando llega un lead nuevo, el sistema comprueba primero si hay un boost activo:
  - Si lo hay y quedan leads, se asigna a ese agente y se descuenta 1.
  - Al llegar a 0, o al pasar la hora de caducidad, el boost deja de aplicarse y vuelve el reparto normal.
- El boost no rompe las reglas existentes: si el agente no está activo se ignora. Si ya tiene una reunión exactamente en ese horario, se registra un aviso en logs pero se respeta la prioridad (es un override manual y temporal).

## Detalles técnicos

1. Migración: nueva tabla `public.agent_assignment_boost`
   - Campos: `agent_id` (ref. profiles), `remaining` (int), `expires_at` (timestamptz), `created_by`, timestamps.
   - GRANTs: `authenticated` (select/insert/update/delete), `service_role` (all). Sin acceso `anon`.
   - RLS: solo admins pueden ver y gestionar (`has_role(auth.uid(), 'admin')`).
   - Trigger de `updated_at`.

2. Edge function `get-next-agent`:
   - Antes del round-robin, buscar el boost activo (`remaining > 0 AND expires_at > now()`), más reciente.
   - Si existe y el agente está activo: decrementar `remaining` de forma atómica y devolver ese agente. No se toca el cursor de round-robin, para que el reparto normal siga donde estaba.
   - Log claro: `[Boost] Asignando a <nombre>, quedan N`.

3. Alta del boost para hoy: insertar la fila con `agent_id` de Miki, `remaining = 3`, `expires_at` = hoy 23:59 Europe/Madrid.

## Fuera de alcance

- No se añade interfaz de administración para crear boosts (se puede hacer después si lo quieres recurrente).
