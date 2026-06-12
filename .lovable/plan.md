## Problema

A fórmula atual no Make do campo `UF_CRM_1779577250982` (Fecha Primera Reunión, tipo **data e hora** no Bitrix) é:

```
if( lead_fecha_reunion ;
    formatDate( parseDate( lead_fecha_reunion ; "DD/MM/YYYY HH:mm" ) ; "YYYY-MM-DD\TH:mm:ss" ) ;
    "" )
```

O webhook envia `lead_fecha_reunion = "2026-06-15"` (formato ISO `YYYY-MM-DD`, só data), mas o `parseDate` está configurado com máscara `DD/MM/YYYY HH:mm` → não bate → quebra a cadeia `parseDate → formatDate → if` → o Bitrix rejeita o mapeamento do campo inteiro.

A causa real é que estamos enviando **3 campos separados** (`lead_fecha_reunion`, `lead_hora_reunion`, `lead_hora_reunion_texto`) e o Make precisa fazer ginástica pra recombinar — qualquer mismatch quebra tudo.

## Solução (Opção B confirmada)

Adicionar **1 campo pré-formatado** no payload do webhook, já no formato exato que o Bitrix de data+hora aceita nativamente, eliminando totalmente o `parseDate`/`formatDate` no Make.

### Novo campo no payload

| Campo | Formato | Conteúdo |
|---|---|---|
| `lead_fecha_reunion_bitrix` | `YYYY-MM-DDTHH:mm:ss` (ISO local, sem timezone) | Combinação de `fecha_reunion` + `hora_reunion`. Se só tiver data → `YYYY-MM-DDT00:00:00`. Se não tiver nada → string vazia `""`. |

Exemplos:
- fecha=`2026-06-15`, hora=`14:30:00` → `"2026-06-15T14:30:00"`
- fecha=`2026-06-15`, hora=`null` → `"2026-06-15T00:00:00"`
- fecha=`null` → `""`

Os campos antigos (`lead_fecha_reunion`, `lead_hora_reunion`, `lead_hora_reunion_texto`, `lead_reunion_datetime`, `lead_zona_horaria_reunion`) **continuam sendo enviados** — assim você não quebra nenhum outro mapeamento existente no Make e ainda mantém o texto cru pro agente ver.

## Alterações no código

**Único arquivo:** `supabase/functions/_shared/bitrixPayload.ts`

Adicionar lógica que computa `lead_fecha_reunion_bitrix` a partir de `lead.fecha_reunion` + `lead.hora_reunion`, e incluir no objeto `payload`.

Não mexer em:
- `meta-lead-webhook/index.ts` (já salva os campos corretos no banco)
- Migrations (nenhuma coluna nova)
- Frontend (campo é só pra Make/Bitrix)

## O que você faz no Make depois do deploy

No node do Bitrix, no campo `UF_CRM_1779577250982`, substituir toda a fórmula `if(...formatDate(parseDate(...))...)` por simplesmente:

```
{{lead_fecha_reunion_bitrix}}
```

Sem `if`, sem `parseDate`, sem `formatDate`. Se vier vazio, o Bitrix simplesmente não preenche o campo (não dá erro).

## Validação

1. Deploy da edge function.
2. `curl` no `meta-lead-webhook` com um payload de teste contendo `hora_reunion: "Mañana 14:30"`.
3. Verificar nos logs que `lead_fecha_reunion_bitrix` aparece com formato `2026-XX-XXTHH:mm:ss`.
4. Você atualiza a fórmula no Make e roda o cenário — o erro `DataError parseDate` desaparece.
