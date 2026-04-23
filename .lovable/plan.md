
# Plano de correção imediata do webhook Meta → Bitrix

## O erro real: por que isso aconteceu

Houve 3 problemas diferentes ao mesmo tempo:

1. **Existem 2 fluxos de webhook diferentes no projeto**
   - `meta-lead-webhook` = fluxo real do lead chegando do Meta Ads.
   - `make-webhook-proxy` = fluxo de teste/manual/reenvio.
   O payload que você colou com `fin_ingresos_mensuales`, `sim_personal_monto`, `sim_hipoteca_monto`, `plan_fase1_*` é do **fluxo antigo de teste/manual**, não do payload Bitrix correto que você quer manter.

2. **O teste do Bitrix ainda reconstrói dados a partir do lead salvo no CRM**
   - Em `meta-lead-webhook`, o lead é salvo com `simulador_personal_data` e `simulador_hipotecario_data`.
   - Mas hoje esse JSON salvo **não guarda tudo o que o teste precisa** com a lógica nova: faltam inputs como `ingresos`, `deudas` e alguns campos calculados novos.
   - Resultado: no teste aparecem `0` em `lead_ingresos_mensuales` e valores antigos/incorretos em alguns campos.

3. **Leads antigos ainda carregam simulações antigas**
   - O valor de **36k** em crédito pessoal aparece porque o teste/manual lê `simulador_personal_data.monto_maximo` de leads antigos e hoje **não normaliza isso antes de enviar**.
   - Ou seja: mesmo com a lógica nova já corrigida no `meta-lead-webhook`, o fluxo de teste/manual ainda pode ressuscitar dados antigos.

## Objetivo final

Fazer com que **o webhook de teste, o webhook manual e o webhook real do Meta Ads** enviem o mesmo pacote correto para o Bitrix, mantendo **exatamente os nomes de variáveis que você já usa no Make**:

- `lead_nombre`
- `lead_telefono`
- `lead_email`
- `lead_edad`
- `meta_dni_nie`
- `lead_preferencia_llamada`
- `lead_zona_interes`
- `lead_ciudad_interes`
- `lead_ingresos_mensuales`
- `lead_valor_deseado`
- `meta_deudas_mensuales`
- `lead_habitaciones`
- `meta_monto_ahorros`
- `meta_vivienda_seleccionada`
- `meta_antiguedad_trabajo`
- `sim_hipoteca_monto_financiable`
- `sim_hipoteca_valor_max_inmueble`
- `sim_hipoteca_cuota_maxima`
- `sim_personal_monto_maximo`
- `sim_personal_cuota_mensual`

Sem quebrar seus cenários do Make.

## O que será implementado

### 1) Corrigir a persistência do lead no `meta-lead-webhook`
Arquivo: `supabase/functions/meta-lead-webhook/index.ts`

Ao salvar o lead no CRM, passar a gravar no JSON da simulação os dados necessários para reenvio fiel:

- `simulador_personal_data`:
  - `ingresos`
  - `deudas`
  - `monto_maximo` já capado em 15k
  - `cuota_mensual`
  - `plazo_meses`
  - `tae_estimada`
  - `aprobado`

- `simulador_hipotecario_data`:
  - `ingresos`
  - `deudas`
  - `monto_maximo_financiable`
  - `cuota_maxima_mensual`
  - `cuota_mensual_real`
  - `valor_maximo_inmueble`
  - `precio_maximo_inmueble`
  - `precio_max_por_ahorros`
  - `precio_max_por_ingresos`
  - `credito_personal_maximo`
  - `plazo_anos`
  - `porcentaje_financiacion`
  - `aprobado`

Isso resolve o problema de o teste posterior não conseguir reconstruir corretamente os campos.

### 2) Unificar o payload Bitrix em um único mapper
Arquivo: `supabase/functions/make-webhook-proxy/index.ts`

Criar um helper interno único, algo como `buildMetaBitrixPayload(lead, agente)`, para ser usado por:
- `test_meta_bitrix_last_lead`
- `send_lead_assignment`

Esse helper vai montar **exatamente** o payload Bitrix esperado, com os nomes corretos das variáveis que você já usa no Make.

Isso elimina divergência entre:
- webhook real do Meta
- teste do Admin
- reenvio manual

## 3) Parar de enviar o formato antigo no teste Bitrix
Arquivo: `supabase/functions/make-webhook-proxy/index.ts`

No fluxo `test_meta_bitrix_last_lead`, remover a dependência do formato antigo:

Campos antigos que hoje aparecem no seu teste e causam confusão:
- `fin_ingresos_mensuales`
- `sim_personal_monto`
- `sim_personal_cuota`
- `sim_hipoteca_monto`
- `sim_hipoteca_cuota`
- `plan_fase1_*`
- `plan_fase2_*`
- `plan_ahorro_mensual_tras_personal`
- `plan_total_coste`
- `plan_gap_calculado`
- `plan_ahorros_cliente`
- `sim_personal_monto_financiado`

O teste Meta Bitrix passará a priorizar os campos corretos que você quer manter no Make:
- `lead_ingresos_mensuales`
- `meta_deudas_mensuales`
- `sim_personal_monto_maximo`
- `sim_personal_cuota_mensual`
- `sim_hipoteca_monto_financiable`
- `sim_hipoteca_valor_max_inmueble`
- `sim_hipoteca_cuota_maxima`

Os extras novos podem continuar existindo, mas o payload principal ficará consistente com sua estrutura atual.

### 4) Blindagem definitiva do crédito pessoal em 15.000€
Arquivos:
- `supabase/functions/meta-lead-webhook/index.ts`
- `supabase/functions/make-webhook-proxy/index.ts`

Aplicar dupla proteção:

- No cálculo real de entrada do lead:
  - `sim_personal_monto_maximo = MIN(teórico, 15000)`

- No reenvio/teste/manual:
  - se o lead salvo tiver valor antigo acima de 15.000, o proxy **normaliza antes de enviar**

Além disso, a `sim_personal_cuota_mensual` será recalculada ou normalizada com a regra atual:
- prazo: **84 meses**
- TAE: **8%**
- teto: **15.000€**

Assim evita o erro incoerente de mandar:
- valor pessoal = 15k
- mas cuota ainda de um crédito antigo maior

## 5) Garantir a hipoteca com a lógica nova no payload final
Arquivos:
- `supabase/functions/meta-lead-webhook/index.ts`
- `supabase/functions/make-webhook-proxy/index.ts`

Manter e reforçar:

- `sim_hipoteca_monto_financiable`
  - hipoteca máxima aprovável com a regra atual

- `sim_hipoteca_valor_max_inmueble`
  - preço recomendado real = `MIN(P1, P2)`

- `sim_hipoteca_cuota_maxima`
  - **cuota real** da hipoteca aprovada
  - não a capacidade teórica de 35%

No proxy de teste/manual, priorizar:
1. `cuota_mensual_real`
2. fallback seguro se o lead for antigo

## 6) Corrigir os campos que hoje estão chegando vazios ou errados no teste
Arquivo: `supabase/functions/make-webhook-proxy/index.ts`

Ajustar a origem dos dados para estes campos:

- `lead_ingresos_mensuales`
  - hoje pode vir `0`
  - passará a vir do JSON salvo já enriquecido

- `meta_deudas_mensuales`
  - hoje está hardcoded como `0` no teste Bitrix
  - passará a vir do dado salvo do lead ou fallback seguro

- `meta_dni_nie`
- `lead_preferencia_llamada`
- `lead_habitaciones`
- `meta_antiguedad_trabajo`
- `meta_monto_ahorros`
- `meta_vivienda_seleccionada`

Esses campos serão consolidados para que o teste Bitrix reflita o que realmente chegou do Meta.

## 7) Evitar novo erro humano no Admin Settings
Arquivos:
- `src/hooks/useAdminSettings.ts`
- `src/pages/AdminSettings.tsx`

Ajuste pequeno de UX para evitar confusão entre os dois testes:

- botão genérico:
  - “Probar Conexión (webhook general)”

- botão Bitrix:
  - “Probar Meta → Bitrix (payload real)”

- texto de apoio:
  - deixar explícito qual botão usa o formato antigo/genérico e qual usa o payload Bitrix real

Isso não muda a lógica de negócio, mas reduz drasticamente o risco de voltar a testar o webhook errado.

## O que não será alterado

- Não mudar os nomes das variáveis que você já usa no Make
- Não mexer no CRM, simulador front, PDF ou recomendações agora
- Não criar migração de banco
- Não tocar no fluxo de descualificados
- Não remover os campos extras novos, apenas garantir que os campos principais estejam corretos

## Resultado esperado depois da correção

Quando você testar o webhook Meta → Bitrix, deverá voltar a receber algo nesse formato:

```text
lead_ingresos_mensuales
meta_deudas_mensuales
lead_habitaciones
meta_monto_ahorros
meta_vivienda_seleccionada
meta_antiguedad_trabajo
sim_hipoteca_monto_financiable
sim_hipoteca_valor_max_inmueble
sim_hipoteca_cuota_maxima
sim_personal_monto_maximo
sim_personal_cuota_mensual
```

E não mais o formato legado com:
```text
fin_ingresos_mensuales
sim_personal_monto
sim_hipoteca_monto
sim_hipoteca_cuota
plan_fase1_*
plan_fase2_*
```

## Validação final

1. Criar um novo lead de teste Meta Ads.
2. Rodar **Probar Meta → Bitrix (payload real)**.
3. Confirmar no Make que:
   - `lead_ingresos_mensuales` não vem 0
   - `meta_deudas_mensuales` não vem 0 indevidamente
   - `sim_personal_monto_maximo` nunca passa de 15000
   - `sim_personal_cuota_mensual` bate com 15k/84m/8%
   - `sim_hipoteca_valor_max_inmueble` = preço recomendado correto
   - `sim_hipoteca_cuota_maxima` = cuota real da hipoteca
4. Validar um lead antigo para garantir que os fallbacks não vazem 36k outra vez.

## Escopo técnico

- 3 arquivos
  - `supabase/functions/meta-lead-webhook/index.ts`
  - `supabase/functions/make-webhook-proxy/index.ts`
  - `src/pages/AdminSettings.tsx` / `src/hooks/useAdminSettings.ts`
- Sem migração
- Sem impacto relevante de performance
- Mudança focada apenas em payload, persistência e teste correto
