
# Plano de Implementação: 2 Ajustes no Portal Admin e Simulador

## Análise dos Pedidos

---

### Pedido 1: Admin ver Kanban de Leads no seu portal

**Situação atual:**
- O `AdminCRM.tsx` tem: métricas globais + tabela de agentes + modal de kanban por agente (abre ao clicar numa linha da tabela)
- NÃO existe uma vista de Kanban global com todos os leads visível diretamente na página — apenas o modal por agente

**O que o utilizador quer:** Ver o Kanban com TODOS os leads diretamente no portal admin (não filtrado por agente), com todas as funcionalidades de gestão (ver detalhes, editar, mover stage, etc.)

**Solução:** Adicionar uma segunda secção ao `AdminCRM.tsx` com o `LeadKanban` completo usando todos os leads do sistema, mais os modais de suporte (LeadDetailsModal, CreateEditLeadModal, SimuladoresModal, RecomendacionesModal) — exatamente como já existe no `AgenteCRM.tsx`.

---

### Pedido 2: Simulador integrado como simulador apresentado na página principal

**Situação atual:**
- A rota `/simuladores` já aponta para `SimuladoresIndex.tsx` que é o formulário unificado (crédito pessoal + hipotecário juntos)
- O card na `Index.tsx` diz "Simuladores" e linka para `/simuladores` — correto

**O que o utilizador provavelmente quer:** O texto do card na página inicial reflita claramente que é o simulador UNIFICADO (não dois separados), e que a descrição mencione explicitamente crédito pessoal e hipotecário. Isso garante que o utilizador final sabe que está a aceder a ambos de uma vez.

**Solução:** Atualizar apenas o texto do card "Simuladores" na `Index.tsx`:
- Título: "Simuladores" → "Simulador Financiero"
- Descrição: "Accede a herramientas de simulación para cálculos inmobiliarios" → "Calcula tu crédito personal e hipotecario en un único formulario integrado"
- Botão: "Acceder a los simuladores" → "Acceder al Simulador"

---

## Implementação Detalhada

### Parte 1: Kanban de Leads no Admin — `AdminCRM.tsx`

**Estrutura proposta:**
Adicionar abaixo da tabela de agentes (que já existe) uma nova secção "Vista Kanban - Todos los Leads" com:
1. `LeadKanban` com todos os leads
2. Barra de pesquisa por nome (igual ao AgenteCRM)
3. Modais de suporte para gestão completa

**Imports a adicionar:**
- `LeadKanban` (já existe em `@/components/crm/LeadKanban`)
- `LeadDetailsModal`, `CreateEditLeadModal`, `SimuladoresModal`, `RecomendacionesModal` (já existem)
- `Lead` do tipo `@/types/crm`

**Estado a adicionar:**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [createModalOpen, setCreateModalOpen] = useState(false);
const [editingLead, setEditingLead] = useState<Lead | null>(null);
const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
const [recomendacionesLead, setRecomendacionesLead] = useState<Lead | null>(null);
const [simuladoresLead, setSimuladoresLead] = useState<Lead | null>(null);
```

**Hooks adicionais:**
- `updateLeadStage`, `updateLead`, `createLead`, `deleteLead` já vêm do `useLeads()` que JÁ está importado

**Leads filtrados:**
```typescript
const filteredLeadsKanban = useMemo(() => {
  if (!searchQuery.trim()) return leads;
  return leads.filter(lead => 
    lead.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [leads, searchQuery]);
```

**UI adicionada (depois da tabela de agentes):**
```
<Card>
  <CardHeader>
    <CardTitle>Vista Kanban - Todos los Leads</CardTitle>
    <Input placeholder="Buscar lead..." value={searchQuery} onChange={...} />
  </CardHeader>
  <CardContent>
    <LeadKanban
      leads={filteredLeadsKanban}
      onStageChange={updateLeadStage}
      onViewDetails={setDetailsLead}
      onEdit={setEditingLead}
      onDelete={handleDeleteLead}
      onDisqualify={handleDisqualify}
    />
  </CardContent>
</Card>

{/* Modais */}
<LeadDetailsModal ... />
<CreateEditLeadModal ... />
<SimuladoresModal ... />
<RecomendacionesModal ... />
```

**Handlers adicionados:**
- `handleDeleteLead` — confirmar e deletar (sem AlertDialog extra, usar toast de confirmação simples)
- `handleDisqualify` — mover para stage 'descualificados' via `updateLeadStage`
- `handleStageChange` — delegar para `updateLeadStage`

**Performance:** O `useLeads()` já está a ser chamado na linha 15 de `AdminCRM.tsx`. Não há nenhuma query adicional ao banco — reusamos os mesmos dados já carregados para a tabela.

---

### Parte 2: Atualizar texto do card Simulador — `Index.tsx`

**Mudança mínima (apenas 3 linhas de texto):**

| Antes | Depois |
|---|---|
| `<CardTitle>Simuladores</CardTitle>` | `<CardTitle>Simulador Financiero</CardTitle>` |
| "Accede a herramientas de simulación para cálculos inmobiliarios" | "Calcula tu crédito personal e hipotecario en un único formulario integrado" |
| "Acceder a los simuladores" | "Acceder al Simulador" |

---

## Arquivos a Modificar

| Arquivo | Tipo | Mudança |
|---|---|---|
| `src/pages/inventario/AdminCRM.tsx` | Editar | Adicionar vista Kanban completa com modais de gestão |
| `src/pages/Index.tsx` | Editar | Atualizar texto do card Simulador (3 linhas) |

---

## Garantias / O que NÃO se toca

- Zero mudanças no backend, RLS, Edge Functions ou base de dados
- O `AgentLeadsKanbanModal` por agente continua funcionando (clicar numa linha da tabela)
- O `AgenteCRM.tsx` não é modificado
- As rotas de simuladores individuais não são tocadas
- O `useLeads()` NÃO é duplicado — reusa o que já está instanciado
- Performance: sem queries adicionais, sem hooks duplicados

---

## Riscos

| Risco | Mitigação |
|---|---|
| Kanban com muitos leads pode ser lento | O `LeadKanban` já tem `useMemo` otimizado internamente. A barra de pesquisa ajuda a filtrar |
| Conflito de state entre tabela e kanban | States independentes e claramente nomeados |
