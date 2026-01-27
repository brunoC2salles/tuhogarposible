
# Plano de Correção: Filtro de Ingresos e Idade no Webhook

## Diagnóstico Confirmado

### 1. Filtro de Ingresos
- **Valor atual**: 1050€ (linha 398 do meta-lead-webhook)
- **Valor desejado**: 1300€
- **Ação**: Alterar `if (ingresos < 1050)` para `if (ingresos < 1300)`

### 2. Idade no Webhook
Os dados confirmam que **o campo de idade NÃO está chegando** do Meta Ads/Make.com:
- Todos os leads recentes mostram: `Edad: não informada`
- O campo `lead_edad` está sempre `null` nos webhook_logs

**Causa raiz**: O formulário do Meta Ads ou o scenario do Make.com **não está enviando o campo de idade**. O sistema está preparado para receber (aceita `edad`, `age`, `birth_year`, etc.), mas o dado simplesmente não chega.

---

## Alterações no Código

### Arquivo: `supabase/functions/meta-lead-webhook/index.ts`

**Linha 397-399** - Alterar filtro de qualificação:

```typescript
// ANTES
// Critério 5: Ingresos >= 1050€
if (ingresos < 1050) {
  return { cualificado: false, razon_no_cualificado: 'Ingresos insuficientes (menos de 1050€)' };
}

// DEPOIS
// Critério 5: Ingresos >= 1300€
if (ingresos < 1300) {
  return { cualificado: false, razon_no_cualificado: 'Ingresos insuficientes (menos de 1300€)' };
}
```

---

## Ação Necessária (Externa ao Código)

Para a idade aparecer no webhook do Bitrix, você precisa verificar no **Make.com**:

1. Abra o scenario que processa leads do Facebook Ads
2. Localize o módulo HTTP que envia dados para `meta-lead-webhook`
3. Verifique se existe um campo `edad` (ou `age`) sendo mapeado
4. Se não existir, adicione o mapeamento do campo de idade do Facebook para o payload

**Nomes de campo aceitos pelo sistema**:
- `edad` (recomendado)
- `age`
- `birth_year`
- `ano_nacimiento`
- `fecha_nacimiento`

---

## Resumo das Alterações

| Arquivo | Modificação | Risco |
|---------|-------------|-------|
| `supabase/functions/meta-lead-webhook/index.ts` | Alterar filtro de 1050€ para 1300€ | Baixo |

---

## Impacto

- **Leads com ingresos entre 1050€ e 1299€** passarão a ser desqualificados automaticamente
- A mensagem de erro será atualizada para refletir o novo limite
- **A idade continuará ausente** até que o campo seja adicionado no Make.com/Meta Ads

---

## Validação Pós-Implementação

1. Verificar nos próximos leads se a mensagem de desqualificação mostra "menos de 1300€"
2. Após configurar o campo de idade no Make.com, verificar se `lead_edad` começa a aparecer nos webhook_logs
