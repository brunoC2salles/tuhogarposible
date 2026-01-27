

# Plano de Correção: Enviar Idade do Lead para o Bitrix

## Diagnóstico Confirmado

O problema está no arquivo `supabase/functions/make-webhook-proxy/index.ts`:

- **O campo `lead_edad` NÃO está sendo enviado** nos payloads das actions:
  - `test_meta_bitrix_last_lead` (linha 427-473)
  - `send_lead_assignment` (linha 578-606)

- **A idade está registrada nas notas** do lead como `Edad: [valor]` (verificado no banco de dados)

- **Já existe uma função `extractFromNotes()`** (linha 420-425) que pode ser usada para extrair a idade

---

## Alterações Necessárias

### Arquivo: `supabase/functions/make-webhook-proxy/index.ts`

#### Alteração 1: Action `test_meta_bitrix_last_lead`

**Linha 439** - Adicionar `lead_edad` após `lead_valor_deseado`:

```typescript
// ANTES (linhas 438-442)
lead_ciudad_interes: lead.ciudad_interes || '',
lead_valor_deseado: lead.valor_inmueble_deseado || 0,

// Ingresos mensuales - campo fundamental para simuladores
lead_ingresos_mensuales: simHipoteca.ingresos || simPersonal.ingresos || 0,

// DEPOIS
lead_ciudad_interes: lead.ciudad_interes || '',
lead_valor_deseado: lead.valor_inmueble_deseado || 0,

// Edad - extraído das notas do lead
lead_edad: extractFromNotes(lead.notas, 'Edad') || '',

// Ingresos mensuales - campo fundamental para simuladores
lead_ingresos_mensuales: simHipoteca.ingresos || simPersonal.ingresos || 0,
```

#### Alteração 2: Action `send_lead_assignment`

**Linha 590** - Adicionar `lead_edad` após `lead_valor_deseado`:

```typescript
// ANTES (linhas 589-591)
lead_ciudad_interes: lead.ciudad_interes || '',
lead_valor_deseado: lead.valor_inmueble_deseado || 0,
lead_ingresos_mensuales: simHipoteca.ingresos || simPersonal.ingresos || 0,

// DEPOIS
lead_ciudad_interes: lead.ciudad_interes || '',
lead_valor_deseado: lead.valor_inmueble_deseado || 0,
lead_edad: extractFromNotesForAssignment(lead.notas, 'Edad') || '',
lead_ingresos_mensuales: simHipoteca.ingresos || simPersonal.ingresos || 0,
```

**Nota**: Para a action `send_lead_assignment`, precisamos criar uma função helper similar à `extractFromNotes` ou mover a função existente para fora do bloco da action anterior.

---

## Estrutura do Código

A função `extractFromNotes` já existe na linha 420-425, mas está dentro do escopo da action `test_meta_bitrix_last_lead`. Para reutilizá-la, vou movê-la para o escopo global do arquivo (após as funções `flattenPayload` e `sendToMake`).

### Nova estrutura:

```typescript
// Função helper global (após linha 62)
function extractFromNotes(notas: string | null, key: string): string {
  if (!notas) return '';
  const regex = new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, 'i');
  const match = notas.match(regex);
  return match ? match[1].trim() : '';
}
```

---

## Resumo das Alterações

| Localização | Modificação | Risco |
|-------------|-------------|-------|
| Linha 62 | Mover `extractFromNotes` para escopo global | Baixo |
| Linha 420-425 | Remover função duplicada | Baixo |
| Linha 439 | Adicionar `lead_edad` no payload `test_meta_bitrix_last_lead` | Baixo |
| Linha 590 | Adicionar `lead_edad` no payload `send_lead_assignment` | Baixo |

---

## Fluxo de Dados

```text
Meta Ads → meta-lead-webhook → Salva idade nas notas → CRM
                                                        ↓
                                   make-webhook-proxy → Extrai idade das notas → Bitrix
```

---

## Validação Pós-Implementação

1. Usar o botão "Probar con Último Lead" nas configurações admin
2. Verificar nos logs do webhook se `lead_edad` aparece no payload
3. Confirmar no Bitrix se a idade está chegando

---

## Importante

Este fix vai funcionar para todos os leads que já têm a idade registrada nas notas. Para leads onde a idade mostra "não informada", o problema está na origem (Meta Ads/Make.com não está enviando o campo `edad`).

