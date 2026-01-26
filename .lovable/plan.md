
# Plano de Correção: Campo de Idade no Webhook do Bitrix

## Diagnóstico Confirmado

Após análise dos dados, confirmo que:

1. **O campo de idade NÃO está chegando** do Meta Ads/Make.com ao webhook
2. A função `parseEdad()` já está corretamente implementada para aceitar múltiplos formatos
3. A interface `MetaLeadData` já suporta: `edad`, `age`, `birth_year`, `ano_nacimiento`, `fecha_nacimiento`
4. **Nenhum desses campos aparece nas notas dos leads** recentes

### Evidência dos Logs

Leads recentes mostram nas notas:
- Antigüedad: más_de_1_año ✅
- DNI/NIE: nie ✅  
- Habitaciones: 2 ✅
- Zona: Bilbao ✅
- **Idade: AUSENTE** ❌

### Causa Raiz Provável

O scenario do Make.com que processa leads do Facebook Ads e envia ao webhook **não está mapeando o campo de idade**. Isso pode ter sido removido durante a "limpa" mencionada há 2 dias.

---

## Ação Necessária: Verificação Externa

Você precisa verificar no **Make.com**:

1. Abra o scenario que processa leads do Facebook Ads
2. Encontre o módulo HTTP que envia dados para o webhook `meta-lead-webhook`
3. Verifique se existe um campo `edad` (ou similar) sendo enviado
4. Se não existir, adicione o mapeamento do campo de idade do Facebook para o payload

### Nome do Campo no Payload

O webhook aceita qualquer um destes nomes:
- `edad` (recomendado)
- `age`
- `birth_year`
- `ano_nacimiento`
- `fecha_nacimiento`

---

## Melhoria de Diagnóstico (Código)

Para facilitar a identificação de problemas futuros, vou adicionar **logs detalhados** que mostram todos os campos recebidos do Meta Ads.

### Arquivo: `supabase/functions/meta-lead-webhook/index.ts`

Adicionar log de todos os campos recebidos para diagnóstico:

```typescript
// Após linha 522 (após sanitização)
console.log('[meta-lead-webhook] Campos recebidos do payload:', Object.keys(data).join(', '));
console.log('[meta-lead-webhook] Campo edad raw:', data.edad, '| age:', data.age, '| birth_year:', data.birth_year);
```

Adicionar idade às notas do lead para rastreabilidade:

```typescript
// Nas notas do lead (linha 660-669)
const notasLead = [
  `Lead do Meta Ads.`,
  `Qualificação automática: ${qualificacao.cualificado ? '✅ CUALIFICADO' : '❌ NO CUALIFICADO - ' + qualificacao.razon_no_cualificado}`,
  `Idade: ${edadParsed || 'não informada'}`,  // NOVO
  `Preferência de chamada: ${data.preferencia_llamada || 'não especificada'}`,
  // ... resto
```

---

## Arquivos a Modificar

| Arquivo | Modificação | Risco |
|---------|-------------|-------|
| `supabase/functions/meta-lead-webhook/index.ts` | Adicionar logs de diagnóstico e idade nas notas | Baixo |

---

## Resumo

O sistema está funcionando corretamente - ele não pode mostrar a idade porque o dado **não está sendo enviado pelo Make.com**. A correção definitiva requer:

1. **Você verificar o scenario do Make.com** para confirmar se o campo de idade está mapeado
2. Se não estiver, adicionar o mapeamento do campo de idade do Facebook para o payload com nome `edad`

Posso implementar os logs de diagnóstico para facilitar a verificação dos campos que chegam, mas a correção principal depende da configuração do Make.com.

---

## Pergunta Importante

Você consegue acessar o scenario do Make.com que processa os leads do Facebook Ads? Se sim, pode verificar se o campo de idade está sendo mapeado no payload enviado ao webhook?
