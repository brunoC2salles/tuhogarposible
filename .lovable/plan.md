## Problema

Na simulação de um imóvel de 180.000€ aparecem dois valores incoerentes:

- **Cuota Mensual** (real): 640,10€/mes → corresponde a financiar 162.000€ (90% LTV de 180k)
- **Cuota Mensual Máxima**: 711,22€/mes → corresponde a financiar 180.000€

Ambos os blocos mostram "180.000€" como Hipoteca Máxima Financiable, mas as cuotas batem em capitais diferentes. Isto confunde os agentes.

## Causa raiz

Em `src/lib/simuladorUtils.ts` (linhas 601-611) o cálculo de `montoMaximoFinanciable` faz:

```
min(capacidade_por_ingressos, topeAbsoluto[180k/210k])
```

Não considera o **LTV aplicado ao preço do imóvel**. Para esta operação, o banco nunca emprestaria mais do que `precioVivienda × %financiación = 180.000 × 90% = 162.000€`, mas o sistema mostra 180.000€ porque o cliente tem ingressos suficientes para suportar esse valor em teoria.

A "Cuota Mensual Máxima" em `ResultadosCombinados.tsx` (linhas 36-41) calcula a partir desse `montoMaximoFinanciable` inflado → daí os 711,22€ em vez de 640,10€.

## Correção

Em `src/lib/simuladorUtils.ts`, na seção 11.5/11.6, adicionar o LTV como mais um teto:

```
montoMaximoFinanciable = min(
  capacidade_por_ingressos,        // já existe
  topeAbsolutoPorTitulares,        // já existe (180k / 210k)
  precioVivienda × (porcentajeFinanciamiento / 100)   // NOVO
)
```

Resultado para o caso do print: `min(~180k, 180.000, 162.000) = 162.000€`. A Cuota Mensual Máxima passa a ser 640,10€ — igual à Cuota Mensual real, eliminando a confusão.

## Comportamento esperado em outros cenários

- Cliente com ingressos baixos para um imóvel barato: continua limitado pela capacidade (como hoje).
- Cliente com ingressos altos e imóvel caro acima do tope absoluto: continua limitado pelos 180k/210k.
- Cliente com boa capacidade mas LTV restritivo (residente, não-residente, inversão, etc.): passa a refletir corretamente o máximo real para aquele imóvel.

## Arquivos afetados

- `src/lib/simuladorUtils.ts` — adicionar o teto por LTV no cálculo de `montoMaximoFinanciable` (≈3 linhas).

Os componentes de UI (`ResultadosCombinados.tsx`, `ResultadosSimulacionHipotecaria.tsx`) já leem o valor corrigido e não precisam de alteração — a Cuota Mensual Máxima passará automaticamente a coincidir com a Cuota Mensual quando o LTV for o fator limitante.

## Memory

Atualizar `mem://features/mortgage-simulator-rules-2025` para refletir que `montoMaximoFinanciable` agora é o mínimo entre capacidade, tope absoluto e LTV × preço.
