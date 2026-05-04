---
name: AdminCRM default load filter
description: AdminCRM loads only last 30 days and excludes 'descualificados' by default; period selector + toggle let admin reload broader sets. Filters persisted in localStorage.
type: performance
---

`useLeads(options)` accepts `{ periodDays, includeDisqualified }`. Filters apply at the Supabase query level (`.gte('created_at', cutoff)` and `.neq('stage','descualificados')`) — not client-side — to actually reduce payload.

AdminCRM defaults: `periodDays: 30`, `includeDisqualified: false` (~1.500 of 4.779 leads). Admin can switch via period dropdown (30/90/All) and "Incluir descualificados" toggle. Preferences stored in `localStorage` key `admincrm.filters.v1`.

AgenteCRM, SupervisorCRM and `AgentLeadsKanbanModal` call `useLeads()` with no args → no behavior change (loads everything for that scope).

The "Leads por Agente" table is now an on-demand pop-up (`AgentStatsModal`) opened from the Kanban header, not an inline section.
