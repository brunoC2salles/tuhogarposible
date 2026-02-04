

## Plano de Correção: Webhooks Make.com

### Diagnóstico Detalhado

Após análise completa, identifiquei **3 problemas distintos**:

---

### Problema 1: Erro "Error al conectar con Edge Function" no teste de leads qualificados

**Causa**: A action `test_qualified_last_submission` busca numa tabela `form_submissions` que **não existe mais** no sistema. O sistema foi migrado para usar apenas `leads`.

**Evidência**:
```
Error: relation "form_submissions" does not exist
```

---

### Problema 2: Webhook de descualificados não dispara automaticamente

**Causa**: O `meta-lead-webhook` cria leads já no stage `descualificados` mas **não dispara** o webhook de descualificação. O disparo só ocorre quando:
- Um usuário **move manualmente** um lead para `descualificados` via CRM
- O teste manual é acionado via Admin Settings

**Evidência dos logs**:
- 5+ leads descualificados criados hoje pelo Meta Ads
- Apenas 1 registro de webhook de descualificação (teste manual de Thais D Anuzio às 15:28)
- Os leads caridad, Aitana, David, Waldo nunca dispararam webhook

---

### Problema 3: Leads qualificados parecem não chegar ao Bitrix

**Análise**: Os logs mostram que os webhooks estão sendo enviados com status `success`:
- Raynner Correa Diaz ✅ 13:30
- Fabiola ✅ 11:59
- Maribel León ✅ 11:36

**Possível causa**: Cenário no Make.com pode estar desativado ou com erro. Precisa verificar no painel do Make.com.

---

## Plano de Implementação

### Fase 1: Corrigir teste de leads qualificados

**Arquivo**: `supabase/functions/make-webhook-proxy/index.ts`

**Alteração**: Modificar a action `test_qualified_last_submission` para buscar na tabela `leads` em vez de `form_submissions`.

```javascript
// ANTES (linha 260-273):
const { data: submission } = await supabase
  .from('form_submissions')
  .select('*')
  .eq('qualificado', true)
  ...

// DEPOIS:
const { data: lead } = await supabase
  .from('leads')
  .select('*')
  .neq('stage', 'descualificados')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

**Também atualizar**: O payload enviado para usar campos da tabela `leads` ao invés de `form_submissions`.

---

### Fase 2: Disparar webhook automaticamente para leads descualificados

**Arquivo**: `supabase/functions/meta-lead-webhook/index.ts`

**Alteração**: Após criar um lead com stage `descualificados`, invocar o webhook de descualificação.

Adicionar após a linha 712 (após criar o lead):

```javascript
// Se lead foi descualificado, disparar webhook de descualificação
if (!qualificacao.cualificado && leadId) {
  try {
    // Buscar URL do webhook de descualificados
    const { data: disqualifiedSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'webhook_disqualified_url')
      .single();

    const disqualifiedWebhookUrl = disqualifiedSetting?.value;

    if (disqualifiedWebhookUrl && disqualifiedWebhookUrl.trim() !== '') {
      console.log('[meta-lead-webhook] Disparando webhook de descualificação');

      const disqualifiedPayload = {
        source: 'disqualified_lead',
        timestamp: new Date().toISOString(),
        lead_id: leadId,
        lead_nombre: data.nombre,
        lead_email: data.email,
        lead_telefono: data.telefono,
        lead_zona_interes: data.zona_interes || null,
        lead_ciudad_interes: zonaParseada.ciudad || null,
        razon_descualificacion: qualificacao.razon_no_cualificado,
        agente_nombre: null,
        agente_email: null,
        test_mode: false
      };

      const disqualifiedResponse = await fetch(disqualifiedWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disqualifiedPayload)
      });

      // Log
      await supabase.from('webhook_logs').insert({
        webhook_url: disqualifiedWebhookUrl + ' (disqualified)',
        status: disqualifiedResponse.ok ? 'success' : 'error',
        error_message: !disqualifiedResponse.ok 
          ? `HTTP ${disqualifiedResponse.status}` : null,
        payload: disqualifiedPayload
      });

      console.log('[meta-lead-webhook] Webhook descualificação:', 
        disqualifiedResponse.ok ? 'success' : 'error');
    }
  } catch (disErr) {
    console.error('[meta-lead-webhook] Erro ao disparar webhook descualificação:', disErr);
  }
}
```

---

### Fase 3: Verificação do cenário no Make.com (ação do usuário)

Verificar no painel do Make.com:
1. Cenário ativo para `webhook_meta_bitrix_url`?
2. Há erros no histórico de execuções?
3. Os dados estão sendo mapeados corretamente para o Bitrix24?

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook-proxy/index.ts` | Corrigir action `test_qualified_last_submission` para usar tabela `leads` |
| `supabase/functions/meta-lead-webhook/index.ts` | Adicionar disparo automático do webhook de descualificação |

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Quebrar fluxo existente | Manter lógica existente, apenas adicionar novo código |
| Performance | Webhook é assíncrono, não bloqueia fluxo principal |
| Duplicação de webhooks | Verificar se lead já foi processado antes de disparar |

---

## Testes Após Implementação

1. **Teste action qualificado**: Clicar "Probar Webhook" no Admin Settings → deve funcionar sem erro
2. **Teste descualificados automático**: Enviar um lead via Meta Ads que será descualificado → webhook deve disparar automaticamente
3. **Verificar logs**: Confirmar que os webhooks aparecem na tabela `webhook_logs`

---

## Seção Técnica Adicional

A tabela `form_submissions` foi provavelmente removida ou nunca existiu neste projeto. O sistema atual usa apenas:
- `leads` - para armazenar leads do CRM
- `webhook_logs` - para registrar disparos de webhooks
- `admin_settings` - para configurações de URLs

O código do `make-webhook-proxy` contém referências obsoletas que precisam ser atualizadas.

