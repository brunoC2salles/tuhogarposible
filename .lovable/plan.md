

## Diagnóstico

A regra é **simples e dura**: ahorros < 5.000 € → NO CUALIFICADO. Sem compensações, sem fórmulas extras. Aplicar nos dois sítios onde "qualificação" existe:

1. **`meta-lead-webhook`** — função `qualificarLead()` em `supabase/functions/meta-lead-webhook/index.ts`. Já lemos `monto_ahorros` (`montoAhorros`), mas hoje só usamos para o "gap" das recomendações; a qualificação ignora-o.
2. **Simulador hipotecário** — `calcularSimulacionHipotecaria()` em `src/lib/simuladorUtils.ts` (linha 588). Hoje, `aprobable` ignora o capital próprio (a memória `mortgage-simulator-rules-2025` confirma). Vou adicionar o critério de 5k€ ao cálculo de `aprobable` e `razonNoAprobado`.

## Plano (2 ficheiros, sem migração, sem schema novo, sem peso extra)

### 1. `supabase/functions/meta-lead-webhook/index.ts`
- Em `qualificarLead()`, **acrescentar** "Critério 7: Ahorros ≥ 5.000€" como **último** check (depois de ingressos/deudas). Razão: `'Ahorros insuficientes (menos de 5.000€)'`.
- Passar `montoAhorros` como argumento (já é calculado mais abaixo no fluxo — vou mover o `parseDeudas(data.monto_ahorros)` para **antes** da chamada `qualificarLead`, sem duplicar lógica).
- Sem alterar mais nada (recomendações, plan de pagos, webhooks de descualificação continuam exatamente iguais).

### 2. `src/lib/simuladorUtils.ts`
- Em `calcularSimulacionHipotecaria()`, adicionar critério: `ahorrosSuficientesMinimo = datos.ahorrosDisponibles >= 5000`.
- Incluir no `aprobable`: `aprobable = ahorrosSuficientesMinimo && ...resto`.
- Adicionar primeira `razonNoAprobado` (com prioridade alta): *"Ahorros insuficientes: tienes X€ disponibles pero el mínimo requerido es 5.000€."*
- Sem mexer no schema do form (`ahorrosDisponibles` já é obrigatório `min(0)`), sem mexer em UI (a UI já mostra `razonNoAprobado` nos componentes `ResultadosSimulacionHipotecaria.tsx` e `ResultadosCombinados.tsx`).

### O que NÃO toco
- `bewor-*`, RLS, schema, ContraConfig, simulador personal, ResultadosCombinados, `mortgage-simulator-rules-2025` memory (vou **atualizar** esta memória para refletir a nova barreira de 5k€, sem reescrever as outras regras), webhooks Make/Bitrix, página `/admin/verificaciones-extractos`, etc.
- Sem alterações a tipos do Supabase.
- Sem novas dependências.

### Memória a atualizar
- `mem://features/mortgage-simulator-rules-2025`: adicionar uma linha "Ahorros mínimos obrigatórios: 5.000€. Se inferior, hipoteca NO APROBABLE com razón clara." (mantém o resto intacto).
- `mem://features/meta-ads-qualification-rules-2025` (vou criar a memória — não existe ainda — sintetizando os 6 critérios atuais + o novo de ahorros).

## Resultado esperado
- Lead Meta Ads com `monto_ahorros < 5000` → criado como `descualificados` com nota *"NO CUALIFICADO - Ahorros insuficientes (menos de 5.000€)"* e dispara o webhook de descualificados (sem código novo — reaproveita o fluxo existente).
- Cliente que use o simulador público com ahorros < 5k vê a badge "HIPOTECA NO APROBABLE" + razón clara, em vez de números calculados.
- Quem tiver ≥ 5k€ continua a ser avaliado pelos critérios atuais (rendimento, DTI, idade, etc.) — zero impacto.

## Pergunta opcional
A memória atual diz: *"A aprovação NÃO é bloqueada por insuficiência de capital próprio."* Esta nova regra contradiz parcialmente (passa a haver um piso mínimo de 5k€). Vou atualizar a memória para refletir a nova realidade — só te aviso aqui para que saibas que ficou registado.

