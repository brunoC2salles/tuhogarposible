
# Plano de Correção: Regra de 35% do Simulador Hipotecário

## Problema Identificado

A fórmula atual calcula o máximo de cuota mensual de forma incorreta:

**Atual**: `(ingresosTotales × 0.35) - creditosPendientes - gastosPension`

**Correto**: `(ingresosTotales - creditosPendientes - gastosPension) × 0.35`

Isso significa que a cuota máxima permitida deve ser **35% da renda líquida** (após descontar dívidas e pensão), não 35% da renda bruta menos as dívidas.

---

## Alteração Necessária

### Arquivo: `src/lib/simuladorUtils.ts`

**Linhas 521-525** - Corrigir cálculo da hipoteca máxima mensual:

```typescript
// ANTES
// 11. HIPOTECA MÁXIMA MENSUAL (35% dos ingresos)
const hipotecaMaximaMensual = Math.max(
  0,
  (ingresosTotales * 0.35) - creditosPendientesTotales - gastosPension
);

// DEPOIS
// 11. HIPOTECA MÁXIMA MENSUAL (35% dos ingresos líquidos)
const ingresosLiquidos = ingresosTotales - creditosPendientesTotales - gastosPension;
const hipotecaMaximaMensual = Math.max(0, ingresosLiquidos * 0.35);
```

---

## Impacto da Mudança

A nova fórmula é **mais permissiva**, permitindo cuotas maiores para pessoas com dívidas:

| Cenário | Fórmula Antiga | Fórmula Nova |
|---------|----------------|--------------|
| 2000€ ingresos, 300€ deudas | 400€ max | 595€ max |
| 2500€ ingresos, 400€ deudas | 475€ max | 735€ max |
| 3000€ ingresos, 0€ deudas | 1050€ max | 1050€ max (igual) |

Leads que antes eram rejeitados por margem estreita poderão ser aprovados.

---

## Resumo

| Arquivo | Modificação | Risco |
|---------|-------------|-------|
| `src/lib/simuladorUtils.ts` | Corrigir fórmula de 35% | Baixo |

---

## Validação Pós-Implementação

1. Testar simulador hipotecário com valores conhecidos
2. Verificar se leads com dívidas estão sendo avaliados corretamente
3. Confirmar que a cuota máxima reflete 35% da renda líquida
