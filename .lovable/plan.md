# Plano — CRM mais leve e Kanban como protagonista

## Diagnóstico

Hoje o `useLeads` traz **4.779 leads** (3.145 descualificados + 1.634 ativos) toda vez que o CRM abre, e o mesmo hook é compartilhado pelo `AdminCRM`, `AgenteCRM`, `SupervisorCRM` e `AgentLeadsKanbanModal`. Cada `updateLead`/`updateLeadStage` chama `fetchLeads()` e re-renderiza o Kanban inteiro com milhares de cards. É essa a raiz da lentidão.

O `AdminCRM` ainda mostra a tabela "Leads por Agente" inline, ocupando muito espaço acima do Kanban.

## O que vai mudar

### 1. Filtro de carga padrão no `useLeads` (a parte que mais impacta performance)

Adicionar um parâmetro opcional ao hook para limitar o que é carregado, **sem mexer no comportamento atual de quem não passar nada** (assim `AgenteCRM` e `SupervisorCRM` continuam iguais e não há regressão):

```ts
useLeads({ periodDays?: 30 | 90 | null, includeDisqualified?: boolean })
```

Regras:
- Padrão no `AdminCRM`: `periodDays: 30`, `includeDisqualified: false` → ~1.500 leads (queda de ~70%).
- Filtro aplicado **na query Supabase** (`.gte('created_at', ...)` e `.neq('stage','descualificados')`), não no cliente — é o que de fato reduz o payload.
- `AgentLeadsKanbanModal` (drilldown por agente) passa `periodDays: null` para continuar mostrando tudo daquele agente — volume baixo, sem problema.
- `AgenteCRM` (portal do agente) mantém `periodDays: null` por enquanto — cada agente tem poucos leads próprios, não é o gargalo.

### 2. Toggle "Mostrar descualificados" no topo do Kanban (AdminCRM)

- Checkbox/switch ao lado da busca: "Incluir descualificados".
- Ao marcar, refaz o fetch com `includeDisqualified: true` (recarrega, mas só nesse momento).
- Estado salvo em `localStorage` para lembrar a preferência do admin entre sessões.

Selector de período (30 / 90 / Todos) fica ao lado, mesma lógica.

### 3. Tabela "Leads por Agente" → Pop-up

- Remover o `<Card>` da tabela do corpo do `AdminCRM`.
- Adicionar botão **"Ver leads por agente"** (ícone `Users`) no header do card do Kanban, ao lado da busca e do "Exportar Estatísticas".
- Criar componente novo `AgentStatsModal` que recebe `agentesWithStats` e renderiza a mesma tabela atual dentro de um `Dialog` grande. Click numa linha continua abrindo o `AgentLeadsKanbanModal` já existente.
- Os KPIs do topo (Total / Convertidos / Tasa) **permanecem** como estão.

### 4. Memo/index update

Atualizar memória com a nova regra: "AdminCRM carrega apenas últimos 30 dias e exclui descualificados por padrão; toggle reabre."

## Arquivos afetados

- `src/hooks/useLeads.ts` — adicionar params opcionais, query condicional, refetch quando params mudam.
- `src/pages/inventario/AdminCRM.tsx` — passar params, remover tabela inline, adicionar botão+toggle.
- `src/components/crm/AgentStatsModal.tsx` — **novo**, extrai a tabela atual.
- `src/components/crm/AgentLeadsKanbanModal.tsx` — passar `periodDays: null` para preservar visão completa do agente.
- `mem://index.md` (Core) e novo `mem://performance/crm-admin-default-filter`.

## O que **NÃO** vou mexer (proteções)

- `AgenteCRM.tsx`, `SupervisorCRM.tsx`, `LeadKanban.tsx`, `LeadCard.tsx` — comportamento idêntico.
- Lógica de `updateLead/updateLeadStage/createLead/deleteLead` — sem alterações.
- RLS, schema, edge functions, webhooks — nada disso entra.
- Estrutura visual dos cards e cores do Kanban.

## Resultado esperado

- AdminCRM abre carregando ~1.500 leads em vez de 4.779 (≈3x mais rápido na carga inicial e nas re-renderizações pós-update).
- Kanban vira o foco da página; a análise por agente fica a um clique de distância.
- Reversível: basta abrir o toggle "Incluir descualificados" + período "Todos" para ver exatamente o que se vê hoje.

Aprove para eu implementar.
