## Diagnóstico encontrado

- O webhook está recebendo `HTTP 200` do Make, então do ponto de vista da plataforma o envio foi aceito.
- O último lead citado foi criado como `descualificados`, então o disparo automático Meta → Bitrix não roda porque hoje ele só dispara quando `qualificacao.cualificado && leadId`.
- O teste/reenvio forçado aparece como `success`, mas pode não acionar a automação do Make se o cenário estiver filtrando por `source`, ou se o Make respondeu `200` no webhook inicial mas parou em módulos posteriores.
- As duas URLs configuradas (`webhook_makecom_url` e `webhook_meta_bitrix_url`) parecem apontar para o mesmo webhook do Make, o que pode misturar ping técnico, replay e payload real no mesmo cenário.

## Plano de correção

1. **Corrigir parsing de ahorros**
   - Ajustar `parseAhorros` para interpretar corretamente rangos como `25.000€ - 50.000€`.
   - O valor deve virar algo como `37500`, não `25`.
   - Assim leads com renda e poupança suficientes voltam a ser qualificados e disparam automaticamente para Bitrix.

2. **Reforçar logs do envio real ao Bitrix**
   - No `meta-lead-webhook`, registrar também o corpo de resposta do Make mesmo quando o status for `200`.
   - Adicionar um log explícito quando o lead não dispara por estar descualificado, com o motivo.

3. **Melhorar teste no Settings**
   - Deixar claro no histórico se o envio foi `meta_ads`, `test_meta_bitrix` ou `replay_qualified`.
   - Opcionalmente, trocar o teste para enviar `source: meta_ads` se o cenário do Make só roda com esse filtro.

4. **Reclassificar o lead afetado**
   - Atualizar o lead recente `lina / felinaescorpion@hotmail.com` criado às 15:28, que foi descualificado por erro de ahorros.
   - Mover para `nuevo_lead`, atribuir agente e reenviar ao webhook Meta → Bitrix.

## Observação para o Make

Depois da correção, se o log continuar mostrando `HTTP 200` mas o Bitrix não criar nada, o problema estará dentro do cenário Make após o módulo Webhook. Nesse caso precisaremos revisar filtros/rotas do Make, principalmente filtros por `source` e mapeamento de campos.