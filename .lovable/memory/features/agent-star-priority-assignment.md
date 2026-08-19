---
name: Clasificación de agentes por estrellas
description: Estrellas 1-5 (solo admin) que ponderan el reparto de leads; pesos suaves 1.0-1.4 y mínimo garantizado por ronda
type: feature
---
- `profiles.estrellas` (smallint 1-5, default 3), `assignment_credit`, `last_assigned_at`.
- Solo admin puede cambiar estrellas (trigger `prevent_estrellas_change_by_non_admin` revierte cambios de no-admin). Editor en `/admin/agentes`.
- Peso muy suave: 1★=1.00 … 5★=1.40 (`starWeight` en `src/components/agents/AgentStarRating.tsx`).
- Reparto: `public.pick_next_agent_weighted(uuid[])` (service_role only) acumula créditos por peso, aplica mínimo garantizado (agente sin lead durante más rondas que candidatos pasa al frente) y elige el de mayor crédito. `get-next-agent` la llama tras filtrar disponibilidad, solape ±30 min y boost manual.
- Colisiones: solo son conflicto si es el MISMO agente a <30 min; varios leads a la misma hora con agentes distintos es correcto.
- Panel `/admin/asignaciones` considera solo leads cualificados (excluye `no_cualificado` y `descualificados`).
