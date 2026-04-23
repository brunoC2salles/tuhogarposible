

# Plano: cálculo correcto de Crédito Personal + Hipoteca Máxima no webhook do Meta Ads

## Diagnóstico actual

O webhook `meta-lead-webhook` está **desactualizado** em relação ao simulador unificado. Hoje faz dois cálculos próprios e antigos:

- **`calcularSimulacionPersonal`** (linha 499): usa 35% de capacidade, prazo 84 meses, TAE 8%, **tope antigo de 50.000€**. Não respeita o teto de **15.000€** que pediste.
- **`calcularSimulacionHipotecaria`** (linha 539): usa 35%, TAE 3,5%, financia 80% fixo. **Não aplica** os caps de 180k/210k, nem o mínimo de 70k, nem o ITP por CCAA, nem o novo **Precio Máximo de Inmueble** (Punto 1 + Punto 2). A lógica boa só vive no front (`simuladorUtils.ts`).

Resultado: o que chega ao Bitrix do Meta Ads não bate com o que o simulador mostra ao agente. Precisamos alinhar.

## Regras confirmadas (resumo, para validar antes de mexer)

**Crédito personal (NOVO teto 15.000€ para todos):**
- Capacidad disponible mensual = `ingresos × 0,35 − deudas`
- Prazo: **84 meses** (7 anos), TAE **8%**
- Monto máximo teórico = capacidad × factor anualidad
- **Aplicar teto duro de 15.000€** → `CP_max = MIN(monto_teorico, 15.000)`
- Cuota mensual do CP_max = `15.000 × r / (1 − (1+r)^-84)` ≈ **234€/mes** quando bate no teto
- Aprobado se `capacidad ≥ cuota_15k` (≈234€)

**Hipoteca máxima (alinhada ao simulador):**
- Cuota máx = `(ingresos − deudas) × 0,35`
- Plazo: `MIN(30, 75 − edad)`, default 30 se sem idade
- TAE **2,5%** (não 3,5% — alinhar com o simulador)
- `monto_max_financiable = cuota_max × [(1+r)^n − 1] / [r × (1+r)^n]`
- **Cap por titulares: 180.000€** (Meta Ads é sempre 1 titular, não há campo de co-titular no form)
- **Mínimo 70.000€** para considerar aprovável
- **Capacidad mínima 350€/mes**
- % financiación assumido: **90%** (indefinido residente — assumimos o caso melhor por defeito, já que o Meta Ads não pergunta tipo de contrato em detalhe; quem é temporal já foi descualificado pela regra de antigüedad)

**Precio Máximo de Inmueble (Punto 1 + Punto 2):**
- P1 = `((15.000 + ahorros) / 2) / %ITP_CCAA` (ITP da CCAA detectada via `determinarRegion`, fallback 8%)
- P2 = `monto_max_financiable / 0,90`
- **Precio recomendado = MIN(P1, P2)**

## O que se constrói (1 só edge function tocada)

### `supabase/functions/meta-lead-webhook/index.ts`

**1. Reescrever `calcularSimulacionPersonal`** (linhas 499-537):
- Aplicar teto duro `MIN(monto_calculado, 15.000)`
- Recalcular cuota com base nos 15k quando bate no teto
- Devolver: `monto_maximo`, `cuota_mensual`, `plazo_meses`, `tae_estimada`, `aprobado`, `capacidad_disponible_mensual`
- Remover a lógica de "monto necesario / gap" (não faz sentido com teto fixo de 15k — o gap maior será sempre coberto pela hipoteca + ahorros)

**2. Reescrever `calcularSimulacionHipotecaria`** (linhas 539-570):
- Mudar TAE de 3,5% → **2,5%**
- Aplicar **cap 180k**
- Aplicar **mínimo 70k** e **350€/mes** → reflectir em `aprobado`
- Calcular `valor_maximo_inmueble` como `monto_max / 0,90` (não 0,80)
- Devolver também `cuota_mensual_maxima` calculada com a fórmula francesa real (não só a capacidad)

**3. Nova função `calcularPrecioMaximoInmuebleMeta`** (helper local, ~15 linhas):
- Replicar a lógica de `calcularPrecioMaximoInmueble` do front, mas adaptada (sem dependências externas — função pura inline)
- Importar `getITPPorCCAA` de `_shared/marketPrices.ts` se já existir, senão inline mini-tabela ITP (5 linhas, mesmo conteúdo de `src/lib/impuestosCCAA.ts`)
- Devolve `{ precio_max_p1, precio_max_p2, precio_max_recomendado, cp_max, tasa_itp_aplicada }`

**4. Chamar as 3 funções no handler** (perto da linha 741):
- `simulacionPersonal = calcularSimulacionPersonal(ingresos, deudas)`
- `simulacionHipotecaria = calcularSimulacionHipotecaria(ingresos, deudas, edadParsed)`
- `precioMaxInmueble = calcularPrecioMaximoInmuebleMeta({ ahorros: montoAhorros, comunidad: region, monto_max_financiable, pct: 90 })`

**5. Remover plan de pagos de 2 fases** (linhas 752-769):
- Já não faz sentido com teto fixo de 15k. Substituir por bloco mais simples:
  - `pago_total_mensual_aprox = cuota_hipoteca + cuota_personal_15k`
  - `cobertura_ahorros = ahorros + 15.000` (poder de entrada total)
- Atualizar as `notasLead` (linhas 856-877) para refletir a nova realidade (sem fases).

**6. Adicionar campos novos ao payload Bitrix** (linhas 1045-1127):

Manter os existentes (não quebrar Make.com) e **acrescentar**:

```
sim_personal_monto_maximo            // já existe, mas agora capado a 15.000
sim_personal_cuota_mensual           // já existe, agora reflecte os 15k
sim_personal_aprobado                // já existe
sim_personal_tae                     // já existe (8)
sim_personal_plazo_meses             // já existe (84)

sim_hipoteca_monto_financiable       // já existe, agora com cap 180k + min 70k
sim_hipoteca_valor_max_inmueble      // já existe, agora /0.90 e não /0.80
sim_hipoteca_cuota_maxima            // já existe
sim_hipoteca_aprobable               // já existe, agora respeita 70k/350€/cap

// NOVOS — Precio Máximo de Inmueble (alinhados com o simulador)
sim_hipoteca_precio_max_inmueble     // MIN(P1, P2)
sim_hipoteca_precio_max_por_ahorros  // P1
sim_hipoteca_precio_max_por_ingresos // P2
sim_hipoteca_credito_personal_max    // CPmax = (15000 + ahorros) / 2
sim_hipoteca_tasa_itp_aplicada       // ej. 0.06 (Madrid)

// NOVO — pago combinado simplificado
pago_combinado_mensual_aprox         // cuota_hip + cuota_personal_15k
poder_compra_total                   // ahorros + 15.000
```

## Lo que NO se toca

- ❌ Regras de qualificação (`qualificarLead`): intactas. Só calcula simulação se `cualificado === true` (já é assim hoje).
- ❌ Fluxo de atribuição de agente: intacto.
- ❌ Webhook de descualificados: intacto.
- ❌ Recomendações de imóveis: continuam a usar `valor_maximo_inmueble × 1,35` para não cortar inventário (o agente filtra depois no CRM). Sem alterações nesse bloco.
- ❌ `meta_*` campos (resposta original do form): intactos.
- ❌ Simulador do front, CRM, PDF, webhook proxy do Bitrix: já atualizados na entrega anterior. Não tocar.
- ❌ BD: zero migrações. Tudo cabe no `simulador_personal_data` / `simulador_hipotecario_data` (jsonb) que já guardamos.

## Detalhes técnicos

- **Performance**: 1 edge function, mesma latência (cálculos puros, sem chamadas extras).
- **Retro-compatibilidade**: todos os campos antigos do payload Bitrix mantidos. Só **acrescentamos** campos novos. Make.com não quebra.
- **CCAA não detectada** (sem zona_interes ou cidade desconhecida): usa fallback ITP **8%** → P1 conservador, sem crashar.
- **Edge cases**:
  - `ingresos = 0`: cuota = 0, aprobado = false
  - `ahorros = 0`: CPmax = 7.500€ → P1 baixo mas válido
  - `edad` ausente: assume 35 → plazo 30 anos
- **Reversibilidade**: 1 ficheiro, fácil rollback.

## Exemplo de cálculo (validação mental)

Lead Meta Ads: ingresos 2.500€, deudas 200€, ahorros 10.000€, idade 35, zona "Madrid"

- **Crédito personal**: capacidad = 2500×0,35 − 200 = **675€/mes**. Monto teórico ≈ 43k → capado em **15.000€**. Cuota (8%, 84m) ≈ **234€**. Aprobado ✅
- **Hipoteca**: cuota_máx = (2500−200)×0,35 = **805€/mes**. Plazo = 30 anos. TAE 2,5%. Monto_máx ≈ **204k** → capado em **180k**. Cumpre 70k mínimo e 350€ mínimo. Aprobable ✅
- **Precio Máximo de Inmueble**:
  - P1 = ((15.000 + 10.000)/2) / 0,06 = 12.500 / 0,06 = **208.333€**
  - P2 = 180.000 / 0,90 = **200.000€**
  - **Recomendado = 200.000€** ✅

Tudo isto vai limpo ao Bitrix em campos planos.

## Entrega

1 só edge function tocada (`meta-lead-webhook`). Deploy automático. Depois disparamos o teste "Probar con Último Lead" do Admin Settings para validar o payload antes de chegar a leads reais.

