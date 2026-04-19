---
name: Mortgage Simulator Rules 2025
description: Regras de negócio do simulador hipotecário (taxas, limites, aprovação, mínimo de poupanças dinâmico por CCAA)
type: feature
---

Regras do simulador hipotecário em `src/lib/simuladorUtils.ts` (função `calcularSimulacionHipoteca`):

## Cálculo
- Taxa interna fixa: 2.5% anual
- Sistema de amortização: francês (cuota mensual constante)
- Plazo máximo: 30 anos
- Edad máxima ao final do empréstimo: 75 anos (ajusta plazo automaticamente se edad >= 45)

## Mínimos obrigatórios (rejeição automática)
1. **Ahorros mínimos DINÂMICOS**: `valor_inmueble × % ITP da CCAA`. Tabela em `src/lib/impuestosCCAA.ts` (`ITP_POR_CCAA`). Função `calcularAhorrosMinimos(valor, ccaa)`. Mensagem mostra %, valor mínimo e CCAA.
2. **Importe mínimo financiável**: 70.000€
3. **Capacidade de pagamento**: mínimo 350€/mês

## Limites de financiamento (LTV)
- Funcionário público: 100%
- Vivienda habitual + DNI residente: 90%
- Vivienda habitual + NIE residente: 90% (excluindo temporal=0%)
- Não residente / segunda residência: 70%
- Inversão: 50%
- Contrato temporal: 0%

## Hipoteca máxima absoluta
- 1 titular: 180.000€
- 2+ titulares: 210.000€

## Capacidade de endividamento (DTI)
- Cuota máxima = (ingresos_netos − deudas_mensuales) × 0,35

## Ordem de prioridade dos motivos de rejeição
1. Ahorros insuficientes (regra dinâmica por CCAA)
2. Importe < 70.000€
3. Capacidade < 350€/mês
4. Hipoteca > tope absoluto
5. Cuota > 35% disponível

## Webhook Meta Ads
No `meta-lead-webhook` aplica-se apenas o **piso absoluto de 5.000€** porque o lead não traz precio do imóvel confirmado. A regra dinâmica só corre quando o cliente preenche o simulador completo.
