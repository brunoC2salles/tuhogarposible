

# Plan: Desqualificar leads com NIE

## Resumo

Leads com tipo de documento NIE passam a ser automaticamente descualificados, tanto no webhook do Meta Ads quanto no simulador interno.

## Alteração 1: Webhook Meta Ads

**Arquivo:** `supabase/functions/meta-lead-webhook/index.ts`

**Linhas 435-439** — Após verificar que o lead TEM documento, adicionar uma verificação extra: se o tipo detectado contém "nie", descualificar.

```typescript
// Critério 2: Tiene NIE/DNI
const dniResult = parseTieneDniNie(data.tiene_nie_dni);
if (!dniResult.tiene) {
  return { cualificado: false, razon_no_cualificado: 'No tiene NIE/DNI' };
}
// NEW: NIE = descualificado
if (dniResult.tipo && dniResult.tipo.includes('nie')) {
  return { cualificado: false, razon_no_cualificado: 'Tiene NIE - no cualificado' };
}
```

## Alteração 2: Simulador interno

**Arquivo:** `src/lib/simuladorUtils.ts`

Na função `calcularPorcentajeFinanciamiento` (linha 319), quando `tipoDocumento === 'nie'`, retornar `0` imediatamente (financiamento 0% = não qualificado).

Também atualizar o bloco de regras NIE (linhas 350-356) para retornar 0 em todos os casos.

Resultado: qualquer simulação com NIE terá `porcentajeFinanciamiento = 0`, o que automaticamente marca a simulação como não aprovada (o monto financiável será 0).

## Alteração 3: Comentários/documentação

Atualizar os comentários nas linhas 310-317 de `simuladorUtils.ts` para refletir a nova regra (NIE = 0% sempre).

## Ficheiros modificados
- `supabase/functions/meta-lead-webhook/index.ts` — adicionar check NIE na qualificação
- `src/lib/simuladorUtils.ts` — NIE retorna 0% financiamento

## O que NÃO muda
- Lógica do formulário UI (campo DNI/NIE continua visível)
- PDF generator
- Regras de DNI
- Webhook Make.com/Bitrix payload

