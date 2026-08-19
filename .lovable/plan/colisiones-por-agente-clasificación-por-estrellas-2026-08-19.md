# Colisiones por agente + clasificación por estrellas

## 1. Confirmación sobre colisiones

Confirmado: el detector de colisiones del panel **ya agrupa por agente**. Solo marca conflicto cuando el mismo agente tiene dos reuniones a menos de 30 minutos. Dos o más leads a la misma hora con agentes distintos no se cuentan como colisión, ni en el panel ni en el asignador (`get-next-agent` solo excluye al agente que ya está ocupado en esa franja).

LLeve en consideración apenas leads cualificados para todo esto.

Ajustes en la página "Reparto de Leads" para que quede explícito:

- Texto de la tarjeta: "Colisiones de agenda (mismo agente)" y descripción aclarando que varios leads a la misma hora con agentes distintos son correctos.
- Nueva línea informativa: número de franjas horarias compartidas por varios agentes, mostrada como dato normal (no como error), para ver que la simultaneidad entre agentes es habitual y sana.

## 2. Clasificación de agentes por estrellas (1-5)

Solo el admin puede asignar estrellas. Más estrellas = mayor prioridad en el reparto, sin dejar nunca a nadie sin leads.

**Reglas acordadas**

- Peso muy suave: 1★=1.00, 2★=1.10, 3★=1.20, 4★=1.30, 5★=1.40.
- Valor por defecto: 3 estrellas para todo agente sin clasificar.
- Mínimo garantizado por ronda: ningún agente activo puede quedar fuera; si a un agente le toca esperar demasiado, pasa al frente de la cola.

**Dónde se califica**
En la página de Agentes (admin): una columna con 5 estrellas clicables por agente. Solo visible y editable para admin; los agentes y supervisores no la ven ni pueden cambiarla.

**Cómo se reparte**
Round-robin ponderado por créditos:

1. Cada agente candidato acumula créditos proporcionales a su peso.
2. Se elige al agente con más crédito acumulado; al recibir el lead, se le resta 1 crédito.
3. Antes de aplicar el peso, si algún agente activo lleva más rondas sin lead que el número de agentes candidatos, se le asigna a él (mínimo garantizado).
4. Los filtros actuales siguen primero: disponibilidad horaria, exclusión por solape de ±30 min y el boost manual, que sigue teniendo prioridad absoluta.

Con estos pesos, en 100 leads y 10 agentes, un 5★ recibe ~11-12 leads y un 1★ ~8; nadie se queda sin reparto.

**Visibilidad en el panel**
En "Reparto de Leads", la tabla por agente añade una columna de estrellas y un "reparto esperado" según peso, para comparar lo recibido con lo previsto.

## Detalles técnicos

- Migración: columna `estrellas smallint not null default 3` (check 1-5) y `assignment_credit numeric not null default 0` en `profiles`. Política RLS de update de estrellas restringida a `has_role(auth.uid(), 'admin')` mediante política específica; se refuerza con un trigger que revierte cambios de `estrellas` hechos por no-admin (mismo patrón que `prevent_role_self_escalation`).
- `get-next-agent`: sustituir el cursor `agent_assignment_tracking` por selección ponderada. Cada llamada suma `peso` a `assignment_credit` de todos los candidatos, elige el de mayor crédito (desempate por `last_assignment_at` más antiguo) y le resta 1. Se mantiene el registro en `agent_assignment_tracking` para trazabilidad y el mínimo garantizado usa `last_assignment_at` por agente (columna nueva `last_assigned_at` en `profiles`).
- Frontend: `src/pages/AdminAgentes.tsx` (selector de estrellas, solo admin), `src/hooks/useAgentes.ts` (incluir `estrellas`), `src/hooks/useAssignmentMetrics.ts` (traer estrellas y calcular reparto esperado) y `src/pages/admin/AsignacionesMetrics.tsx` (columna estrellas, textos de colisión, contador de franjas compartidas).
- El panel sigue siendo solo lectura; no reasigna leads.