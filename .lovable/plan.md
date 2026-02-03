
# Plano de Implementação - Correções e Melhorias

## Resumo dos Problemas Identificados

Após análise completa do código, identifiquei os seguintes problemas:

1. **Kanban Incompleto**: Falta o estágio `precualificacion` - você especificou 5 estágios mas só implementamos 4
2. **Widget Inmovilla**: Não foi criado - precisa ser adicionado à página inicial
3. **Botão testar webhook**: Não existe para leads descualificados em AdminSettings
4. **Estatísticas de agentes**: Não mostra por dia/semana/mês, e o modal não tem scroll
5. **Exportação CSV**: Não existe exportação de estatísticas de todos agentes
6. **1 lead em stage antigo**: Há 1 lead ainda em `mandamos_expediente` que precisa ser migrado

---

## Fase 1: Correção do Kanban (5 Estágios)

### Ordem Correta dos Estágios

| # | Stage ID | Label Display |
|---|----------|---------------|
| 1 | `nuevo_lead` | Nuevo Leads |
| 2 | `preparacion_expediente` | Preparación Expediente - Fresha |
| 3 | `precualificacion` | Precualificación - Edu |
| 4 | `subida_expediente_bancos` | Subida Expediente a Bancos - Gibobs |
| 5 | `descualificados` | Descualificados |

### Alterações no Banco de Dados

**Migração 1: Adicionar novo valor ao ENUM**
```sql
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'precualificacion';
```

**Migração 2: Migrar leads de stages antigos**
```sql
-- Migrar o 1 lead que ainda está em mandamos_expediente
UPDATE leads 
SET stage = 'subida_expediente_bancos'
WHERE stage = 'mandamos_expediente';
```

### Arquivos Afetados (Frontend)

| Arquivo | Alteração |
|---------|-----------|
| `src/types/crm.ts` | Adicionar `precualificacion` ao type e STAGE_ORDER |
| `src/components/crm/LeadKanban.tsx` | Adicionar cores/ícone para `precualificacion` |
| `src/integrations/supabase/types.ts` | Atualizar Database types |

### Código TypeScript Atualizado

```typescript
// src/types/crm.ts
export type LeadStage = 
  | 'nuevo_lead' 
  | 'preparacion_expediente' 
  | 'precualificacion'           // NOVO
  | 'subida_expediente_bancos' 
  | 'descualificados';

export const STAGE_LABELS: Record<LeadStage, string> = {
  nuevo_lead: 'Nuevo Leads',
  preparacion_expediente: 'Preparación Expediente - Fresha',
  precualificacion: 'Precualificación - Edu',           // NOVO
  subida_expediente_bancos: 'Subida Expediente a Bancos - Gibobs',
  descualificados: 'Descualificados'
};

export const STAGE_ORDER: LeadStage[] = [
  'nuevo_lead',
  'preparacion_expediente',
  'precualificacion',              // NOVO
  'subida_expediente_bancos',
  'descualificados'
];
```

### Impacto nos Webhooks

- **meta-lead-webhook**: Leads qualificados continuam entrando em `nuevo_lead` - sem alteração necessária
- **disqualified-lead-webhook**: Só dispara quando stage = `descualificados` - sem alteração necessária
- **Make.com**: Nenhum impacto - os stages são apenas strings no payload

---

## Fase 2: Widget Inmovilla na Página Inicial

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/inventario/InmovillaWidget.tsx` | Criar componente |
| `src/pages/Index.tsx` | Adicionar card com iframe |
| `src/pages/AdminSettings.tsx` | Adicionar campo para URL do iframe |
| `src/hooks/useAdminSettings.ts` | Adicionar fetch/save da URL |

### Implementação do Widget

```typescript
// src/components/inventario/InmovillaWidget.tsx
interface InmovillaWidgetProps {
  url: string;
  height?: string;
}

export const InmovillaWidget = ({ url, height = "600px" }: InmovillaWidgetProps) => {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-muted">
        <p className="text-muted-foreground">
          URL de Inmovilla no configurada. Configure en Admin Settings.
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full border rounded-lg"
      style={{ height }}
      title="Inmovilla CRM"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
};
```

### Card na Página Inicial

Adicionar novo card após "Academia de Agentes":

```typescript
<Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300 col-span-full lg:col-span-2">
  <CardHeader className="text-center pb-4">
    <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
      <Building2 className="w-8 h-8 text-primary" />
    </div>
    <CardTitle className="text-2xl">Colaboración Inmovilla</CardTitle>
    <CardDescription className="text-lg">
      Accede a los inmuebles de Inmovilla directamente
    </CardDescription>
  </CardHeader>
  <CardContent className="pt-0">
    <InmovillaWidget url={inmovillaUrl} />
  </CardContent>
</Card>
```

---

## Fase 3: Botão de Testar Webhook Descualificados

### Arquivo Afetado

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/AdminSettings.tsx` | Adicionar botão de teste |
| `src/hooks/useAdminSettings.ts` | Adicionar função de teste |

### Lógica do Teste

```typescript
// useAdminSettings.ts
const testDisqualifiedWebhook = async () => {
  try {
    toast.info('Enviando test de webhook descualificados...');
    
    const { data, error } = await supabase.functions.invoke('disqualified-lead-webhook', {
      body: { 
        lead_id: 'test', 
        test_mode: true 
      }
    });

    if (error) throw error;

    if (data?.success) {
      toast.success('✅ Webhook de descualificados funcionando!');
    } else {
      toast.error(`❌ Error: ${data?.message || 'Unknown'}`);
    }
  } catch (err) {
    toast.error('Error al probar webhook');
  }
};
```

### Atualização da Edge Function

Adicionar modo de teste na `disqualified-lead-webhook`:

```typescript
// Se for modo de teste, buscar último lead descualificado
if (test_mode || lead_id === 'test') {
  const { data: lastDisqualified } = await supabase
    .from('leads')
    .select('id')
    .eq('stage', 'descualificados')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
    
  if (!lastDisqualified) {
    return new Response(
      JSON.stringify({ success: false, message: 'No hay leads descualificados para test' }),
      { headers: corsHeaders }
    );
  }
  
  lead_id = lastDisqualified.id;
}
```

---

## Fase 4: Estatísticas de Agentes por Período + Scroll + Exportação

### Problemas Atuais

1. Modal não tem scroll - usa `overflow-hidden` em vez de `overflow-auto`
2. Não calcula leads por dia/semana/mês
3. Não há exportação de estatísticas

### Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/crm/AgentLeadsKanbanModal.tsx` | Adicionar scroll + stats cards |
| `src/pages/inventario/AdminCRM.tsx` | Mostrar dia/semana/mês por agente + botão export |
| `src/types/agent.ts` | Expandir interface |
| `src/lib/csvExporter.ts` | Adicionar função de exportar stats |

### Correção do Scroll no Modal

```typescript
// AgentLeadsKanbanModal.tsx - linha 156
// ANTES: 
<div className="flex-1 overflow-hidden">

// DEPOIS:
<div className="flex-1 overflow-auto">
```

### Cálculo de Estatísticas por Período

```typescript
// Função utilitária para calcular períodos
const calculatePeriodStats = (leads: Lead[], agentId: string) => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Segunda-feira
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const agentLeads = leads.filter(l => l.agente_asignado_id === agentId);
  
  return {
    today: agentLeads.filter(l => new Date(l.created_at) >= startOfDay).length,
    thisWeek: agentLeads.filter(l => new Date(l.created_at) >= startOfWeek).length,
    thisMonth: agentLeads.filter(l => new Date(l.created_at) >= startOfMonth).length,
    total: agentLeads.length
  };
};
```

### Tabela de Agentes com Estatísticas

```typescript
// AdminCRM.tsx - Nova estrutura da tabela
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Agente</TableHead>
      <TableHead className="text-center">Hoy</TableHead>
      <TableHead className="text-center">Semana</TableHead>
      <TableHead className="text-center">Mes</TableHead>
      <TableHead className="text-center">Total</TableHead>
      <TableHead className="text-center">Activos</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {agentesWithStats.map(agente => (
      <TableRow key={agente.id} onClick={() => setSelectedAgent(agente)}>
        <TableCell>{agente.nombre}</TableCell>
        <TableCell className="text-center">{agente.today}</TableCell>
        <TableCell className="text-center">{agente.thisWeek}</TableCell>
        <TableCell className="text-center">{agente.thisMonth}</TableCell>
        <TableCell className="text-center font-bold">{agente.total}</TableCell>
        <TableCell className="text-center">{agente.active}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Exportação de Estatísticas

```typescript
// Função de exportação
const exportAgentStats = () => {
  const headers = ['Agente', 'Email', 'Hoy', 'Semana', 'Mes', 'Total', 'Activos', 'Convertidos', 'Tasa Conversión'];
  
  const rows = agentesWithStats.map(a => [
    a.nombre,
    a.email,
    a.today,
    a.thisWeek,
    a.thisMonth,
    a.total,
    a.active,
    a.converted,
    `${a.conversionRate.toFixed(1)}%`
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, `estadisticas-agentes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
};
```

---

## Ordem de Implementação (Minimizar Risco)

### Passo 1: Migração do Banco (precualificacion)
- Adicionar novo valor ao ENUM
- Migrar lead em `mandamos_expediente`

### Passo 2: Frontend do Kanban
- Atualizar types
- Atualizar LeadKanban com novo estágio

### Passo 3: Modal com Scroll + Stats
- Corrigir overflow do modal
- Adicionar cards de estatísticas
- Adicionar cálculos por período

### Passo 4: Tabela AdminCRM
- Converter para tabela com colunas de período
- Adicionar botão de exportação

### Passo 5: Botão Testar Webhook
- Atualizar edge function
- Adicionar botão em AdminSettings

### Passo 6: Widget Inmovilla
- Criar componente
- Adicionar à página inicial
- Configuração em AdminSettings

---

## Arquivos Modificados (Resumo)

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `supabase/migrations/xxx_add_precualificacion.sql` | Criar |
| `src/types/crm.ts` | Modificar |
| `src/integrations/supabase/types.ts` | Modificar |
| `src/components/crm/LeadKanban.tsx` | Modificar |
| `src/components/crm/AgentLeadsKanbanModal.tsx` | Modificar |
| `src/pages/inventario/AdminCRM.tsx` | Modificar significativamente |
| `src/pages/AdminSettings.tsx` | Modificar |
| `src/hooks/useAdminSettings.ts` | Modificar |
| `supabase/functions/disqualified-lead-webhook/index.ts` | Modificar |
| `src/components/inventario/InmovillaWidget.tsx` | Criar |
| `src/pages/Index.tsx` | Modificar |

---

## Garantias de Segurança

1. **Webhooks não serão afetados**: Os stages são strings nos payloads - adicionar `precualificacion` não quebra nada
2. **Leads não serão perdidos**: A migração só adiciona um novo stage e move 1 lead de stage antigo
3. **Make.com continua funcionando**: O payload continua idêntico, apenas o valor do campo `stage` pode ser novo
4. **Performance mantida**: Cálculos de período são feitos no frontend com dados já carregados (sem queries extras)

---

## Validação Pós-Implementação

1. Verificar que Kanban mostra 5 colunas
2. Arrastar lead entre todas as colunas (testar drag & drop)
3. Clicar em agente no AdminCRM e verificar scroll no modal
4. Verificar estatísticas por dia/semana/mês
5. Testar exportação de estatísticas
6. Testar botão de webhook descualificados
7. Verificar widget Inmovilla na página inicial
