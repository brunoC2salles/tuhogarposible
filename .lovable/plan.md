

## Correções Implementadas: Webhooks Make.com ✅

### Problema 1: Erro "Error al conectar con Edge Function" ✅ CORRIGIDO

**Causa**: A action `test_qualified_last_submission` buscava numa tabela `form_submissions` inexistente.

**Solução**: Atualizado para buscar na tabela `leads` com filtro `.neq('stage', 'descualificados')`.

---

### Problema 2: Webhook de descualificados não dispara automaticamente ✅ CORRIGIDO

**Causa**: O `meta-lead-webhook` criava leads descualificados mas não disparava o webhook.

**Solução**: Adicionado bloco de código após criar o lead para:
1. Verificar se `!qualificacao.cualificado && leadId`
2. Buscar URL do webhook em `admin_settings`
3. Enviar payload para Make.com
4. Registrar em `webhook_logs` com tag `(disqualified_auto)`

---

### Problema 3: Leads qualificados não chegam ao Bitrix ⚠️ VERIFICAR NO MAKE.COM

Os logs mostram que os webhooks estão sendo enviados com `status: success`. Verificar:
1. Cenário ativo para `webhook_meta_bitrix_url`?
2. Histórico de execuções no Make.com
3. Mapeamento correto para Bitrix24

---

## Testes Recomendados

1. **Admin Settings → Probar Webhook** (leads qualificados): Deve funcionar sem erro
2. **Enviar lead descualificado via Meta Ads**: Deve aparecer log com `(disqualified_auto)`
3. **Verificar webhook_logs** para confirmar disparos
