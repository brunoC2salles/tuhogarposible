

# Plano de Implementação Completo

## Visão Geral

Este plano aborda 4 grandes mudanças na plataforma. A ordem de implementação foi pensada para minimizar riscos e garantir que nenhum lead seja perdido.

---

## 1. Webhook para Leads Descartados

### Objetivo
Criar um webhook separado que dispara quando um lead é movido para "Descualificados", enviando dados ao Make.com para que um email de agradecimento seja enviado ao cliente.

### Arquivos Afetados
| Arquivo | Ação |
|---------|------|
| `supabase/functions/disqualified-lead-webhook/index.ts` | Criar (novo) |
| `supabase/config.toml` | Adicionar config da nova função |
| `src/pages/AdminSettings.tsx` | Adicionar campo para URL do webhook |
| `src/hooks/useLeads.ts` | Disparar webhook quando stage = 'descualificados' |

### Lógica do Webhook
```text
Lead movido para 'descualificados'
       ↓
useLeads.updateLeadStage detecta stage == 'descualificados'
       ↓
Invoca edge function 'disqualified-lead-webhook'
       ↓
Busca dados do lead + motivo de descualificação das notas
       ↓
Envia payload para URL configurada em admin_settings
       ↓
Make.com recebe e dispara email de agradecimento
```

### Payload do Webhook
```json
{
  "source": "disqualified_lead",
  "timestamp": "2026-02-03T...",
  "lead_id": "uuid",
  "lead_nombre": "João Silva",
  "lead_email": "joao@email.com",
  "lead_telefono": "+34...",
  "razon_descualificacion": "Ingresos insuficientes",
  "agente_nombre": "Maria García",
  "agente_email": "maria@empresa.com"
}
```

---

## 2. Estatísticas de Leads por Período (CRM de Agente)

### Objetivo
Melhorar o modal AgentLeadsKanbanModal e a página AdminCRM para mostrar leads atribuídos por período: hoje, esta semana, este mês e total.

### Arquivos Afetados
| Arquivo | Ação |
|---------|------|
| `src/types/agent.ts` | Expandir interface AgentStatistics |
| `src/hooks/useAgentStatistics.ts` | Adicionar cálculos por período |
| `src/components/crm/AgentLeadsKanbanModal.tsx` | Mostrar cards de estatísticas |
| `src/pages/inventario/AdminCRM.tsx` | Adicionar colunas de período na lista |

### Nova Interface de Estatísticas
```typescript
interface AgentStatistics {
  total_leads: number;
  leads_today: number;
  leads_this_week: number;
  leads_this_month: number;
  converted_leads: number;
  conversion_rate: number;
  stage_counts: Record<string, number>;
}
```

### Cálculo (Frontend)
Os cálculos serão feitos no frontend usando os leads já carregados (sem nova query ao banco), filtrando por `created_at`:
- **Hoje**: `created_at >= início do dia`
- **Esta semana**: `created_at >= segunda-feira`
- **Este mês**: `created_at >= dia 1 do mês`

---

## 3. Atualização dos Estágios do Kanban

### Mapeamento de Estágios

| Estágio Atual | Novo Estágio | Ação no Banco |
|---------------|--------------|---------------|
| `nuevo_lead` | `nuevo_lead` | Mantém |
| `recopilacion_expediente` | `preparacion_expediente` | Migração de dados |
| `mandamos_expediente` | `subida_expediente_bancos` | Migração de dados |
| `aprobacion_bancaria` | `subida_expediente_bancos` | Migração de dados |
| `tasacion` | `subida_expediente_bancos` | Migração de dados |
| `cobro` | `subida_expediente_bancos` | Migração de dados |
| `finalizada` | `subida_expediente_bancos` | Migração de dados |
| `no_cualificado` | `descualificados` | Migração de dados |

### Novos Estágios (4 + 1)
```typescript
export type LeadStage = 
  | 'nuevo_lead'              // Nuevo leads
  | 'preparacion_expediente'  // Preparación expediente - Fresha Precualificación - Edu
  | 'subida_expediente_bancos'// Subida de expediente a bancos - Gibobs
  | 'descualificados';        // Descualificados

export const STAGE_LABELS: Record<LeadStage, string> = {
  nuevo_lead: 'Nuevo Leads',
  preparacion_expediente: 'Preparación Expediente',
  subida_expediente_bancos: 'Subida Expediente a Bancos',
  descualificados: 'Descualificados'
};

export const STAGE_ORDER: LeadStage[] = [
  'nuevo_lead',
  'preparacion_expediente',
  'subida_expediente_bancos',
  'descualificados'
];
```

### Arquivos Afetados (Frontend)
| Arquivo | Ação |
|---------|------|
| `src/types/crm.ts` | Atualizar LeadStage, STAGE_LABELS, STAGE_ORDER |
| `src/components/crm/LeadKanban.tsx` | Ajustar cores e ícones |
| `src/components/crm/LeadCard.tsx` | Botão descualificar → descualificados |
| `src/hooks/useLeads.ts` | Remover lógica de cobro → fatura (simplificado) |

### Migrações de Banco (CRÍTICO)
```sql
-- Migração 1: Adicionar novos valores ao ENUM
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'preparacion_expediente';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'subida_expediente_bancos';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'descualificados';

-- Migração 2: Mover leads para novos estágios
UPDATE leads SET stage = 'preparacion_expediente' 
WHERE stage = 'recopilacion_expediente';

UPDATE leads SET stage = 'subida_expediente_bancos' 
WHERE stage IN ('mandamos_expediente', 'aprobacion_bancaria', 'tasacion', 'cobro', 'finalizada');

UPDATE leads SET stage = 'descualificados' 
WHERE stage = 'no_cualificado';
```

### Atualização do meta-lead-webhook
O webhook de Meta Ads deve enviar leads qualificados para `nuevo_lead` e não qualificados para `descualificados`:
```typescript
stage: qualificacao.cualificado ? 'nuevo_lead' : 'descualificados'
```

### Atualização da Função get_agent_statistics
```sql
-- Alterar para considerar 'subida_expediente_bancos' como convertido
SELECT COUNT(*) INTO converted_leads
FROM leads
WHERE agente_asignado_id = agent_id
  AND stage = 'subida_expediente_bancos';
```

---

## 4. Integração Inmovilla (Iframe/Widget)

### Análise da API
A API da Inmovilla é baseada em PHP e requer:
- `numagencia`: 13611 (extraído de `13611_244_ext`)
- `addnumagencia`: `244_ext`
- `password`: `*xmA8Z!WQ`

A API tem **limite de requisições por minuto** e não é recomendada para sincronização via cron.

### Solução Escolhida: Iframe
Criar uma página/componente que incorpore o portal da Inmovilla via iframe, com a URL configurável pelo admin.

### Arquivos Afetados
| Arquivo | Ação |
|---------|------|
| `src/pages/inventario/AgenteInventario.tsx` | Adicionar aba/botão para Inmovilla |
| `src/components/inventario/InmovillaWidget.tsx` | Criar componente de iframe |
| `src/pages/AdminSettings.tsx` | Campo para URL do iframe Inmovilla |

### Implementação do Widget
```typescript
// InmovillaWidget.tsx
const InmovillaWidget = ({ url }: { url: string }) => {
  return (
    <iframe
      src={url}
      className="w-full h-[calc(100vh-200px)] border rounded-lg"
      title="Inmovilla CRM"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
};
```

### Considerações de Segurança
- O iframe terá sandbox restritivo
- A URL será validada antes de ser exibida
- Credenciais da API NÃO serão expostas no frontend

---

## Ordem de Implementação

### Fase 1: Estatísticas (Baixo Risco)
1. Atualizar `src/types/agent.ts`
2. Atualizar `src/hooks/useAgentStatistics.ts`
3. Atualizar `src/components/crm/AgentLeadsKanbanModal.tsx`
4. Atualizar `src/pages/inventario/AdminCRM.tsx`

### Fase 2: Migração de Estágios (Alto Risco - CUIDADO)
1. Criar migração SQL para adicionar novos valores ao ENUM
2. Criar migração SQL para mover leads existentes
3. Atualizar `src/types/crm.ts`
4. Atualizar `src/components/crm/LeadKanban.tsx`
5. Atualizar `src/hooks/useLeads.ts`
6. Atualizar `supabase/functions/meta-lead-webhook/index.ts`
7. Atualizar função SQL `get_agent_statistics`

### Fase 3: Webhook Descualificados (Médio Risco)
1. Criar edge function `disqualified-lead-webhook`
2. Atualizar `supabase/config.toml`
3. Adicionar campo em AdminSettings
4. Integrar disparo no `useLeads.ts`

### Fase 4: Inmovilla Widget (Baixo Risco)
1. Criar `InmovillaWidget.tsx`
2. Adicionar à página do agente
3. Configurar URL em AdminSettings

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Perda de leads durante migração | Alto | Fazer backup antes; usar transação SQL |
| Webhooks quebrados | Alto | Manter compatibilidade com stages antigos por 24h |
| Make.com não reconhecer novos campos | Médio | Testar com lead de teste antes do deploy |
| Iframe bloqueado por CORS | Baixo | Verificar se Inmovilla permite embedding |

---

## Testes Recomendados

1. **Antes da migração**: Exportar CSV de todos os leads com seus stages
2. **Após migração**: Verificar se contagem de leads por stage bate
3. **Webhook**: Criar lead de teste e mover para descualificados
4. **Make.com**: Verificar se cenário recebe o novo payload
5. **Inmovilla**: Testar se iframe carrega corretamente

---

## Seção Técnica: Detalhes de Implementação

### SQL Migrations (ordem exata)

**Migration 1: add_new_stage_values.sql**
```sql
-- Adicionar novos valores ao ENUM (não remove os antigos ainda)
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'preparacion_expediente';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'subida_expediente_bancos';
ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'descualificados';
```

**Migration 2: migrate_leads_to_new_stages.sql**
```sql
-- Migrar leads para novos estágios
BEGIN;

-- Backup log
CREATE TABLE IF NOT EXISTS _leads_stage_migration_backup AS
SELECT id, stage as old_stage, now() as migrated_at FROM leads;

-- Preparación expediente
UPDATE leads 
SET stage = 'preparacion_expediente'::lead_stage 
WHERE stage = 'recopilacion_expediente'::lead_stage;

-- Subida expediente (todos os estágios avançados)
UPDATE leads 
SET stage = 'subida_expediente_bancos'::lead_stage 
WHERE stage IN (
  'mandamos_expediente'::lead_stage, 
  'aprobacion_bancaria'::lead_stage, 
  'tasacion'::lead_stage, 
  'cobro'::lead_stage, 
  'finalizada'::lead_stage
);

-- Descualificados
UPDATE leads 
SET stage = 'descualificados'::lead_stage 
WHERE stage = 'no_cualificado'::lead_stage;

COMMIT;
```

**Migration 3: update_agent_statistics_function.sql**
```sql
CREATE OR REPLACE FUNCTION public.get_agent_statistics(agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  total_leads int;
  converted_leads int;
  stage_counts jsonb;
BEGIN
  SELECT COUNT(*) INTO total_leads
  FROM leads
  WHERE agente_asignado_id = agent_id;
  
  -- Novo: considera 'subida_expediente_bancos' como convertido
  SELECT COUNT(*) INTO converted_leads
  FROM leads
  WHERE agente_asignado_id = agent_id
    AND stage = 'subida_expediente_bancos';
  
  SELECT jsonb_object_agg(stage, count)
  INTO stage_counts
  FROM (
    SELECT stage::text, COUNT(*) as count
    FROM leads
    WHERE agente_asignado_id = agent_id
    GROUP BY stage
  ) stage_data;
  
  result := jsonb_build_object(
    'total_leads', total_leads,
    'converted_leads', converted_leads,
    'conversion_rate', CASE 
      WHEN total_leads > 0 THEN ROUND((converted_leads::numeric / total_leads::numeric) * 100, 2)
      ELSE 0
    END,
    'stage_counts', COALESCE(stage_counts, '{}'::jsonb)
  );
  
  RETURN result;
END;
$function$;
```

### Edge Function: disqualified-lead-webhook

```typescript
// supabase/functions/disqualified-lead-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { lead_id } = await req.json();
    
    if (!lead_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Buscar dados do lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, profiles!agente_asignado_id(nombre, email)')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Extrair razão de descualificação das notas
    const razonMatch = lead.notas?.match(/NO CUALIFICADO - ([^\n]+)/);
    const razon = razonMatch?.[1] || 'Motivo no especificado';

    // Buscar URL do webhook
    const { data: setting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_disqualified_url')
      .single();

    const webhookUrl = setting?.value;

    if (!webhookUrl) {
      console.log('[disqualified-webhook] URL not configured');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook URL not configured' }),
        { headers: corsHeaders }
      );
    }

    // Montar payload
    const payload = {
      source: 'disqualified_lead',
      timestamp: new Date().toISOString(),
      lead_id: lead.id,
      lead_nombre: lead.nombre_completo,
      lead_email: lead.email,
      lead_telefono: lead.telefono,
      razon_descualificacion: razon,
      agente_nombre: lead.profiles?.nombre || null,
      agente_email: lead.profiles?.email || null,
    };

    // Enviar webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Log
    await supabase.from('webhook_logs').insert({
      webhook_url: webhookUrl + ' (disqualified)',
      status: response.ok ? 'success' : 'error',
      error_message: !response.ok ? `HTTP ${response.status}` : null,
      payload,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[disqualified-webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

