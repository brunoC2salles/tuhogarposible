
# Plano: eliminar de vez o payload legado e garantir o payload Bitrix correto no teste e na produção

## Por que o erro aconteceu

O resultado que você mostrou no Make **não é o payload Meta → Bitrix novo**. A prova é o próprio `source: test_qualified` e os campos antigos:

- `fin_ingresos_mensuales`
- `sim_personal_monto`
- `sim_personal_cuota`
- `sim_hipoteca_monto`
- `sim_hipoteca_cuota`

Esses campos ainda saem do fluxo legado `test_qualified_last_submission` em `make-webhook-proxy/index.ts`. Esse fluxo antigo:
- continua ativo,
- ainda monta o payload antigo,
- e ainda lê valores de simulação sem a blindagem final dos 15.000€.

Além disso, hoje ainda existem **dois builders diferentes** para o Bitrix:
- um dentro de `meta-lead-webhook/index.ts` para o envio real,
- outro dentro de `make-webhook-proxy/index.ts` para teste/reenvio.

Isso mantém o sistema vulnerável a divergências.

## Objetivo final

Garantir que:

1. O webhook **real** do Meta Ads
2. O botão **Probar Meta → Bitrix (payload real)**
3. O reenvio manual de lead

usem **exatamente o mesmo payload**, com os mesmos nomes que você já usa no Make:

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

E que o crédito pessoal **nunca mais** passe de **15.000€** em nenhum fluxo.

## O que será implementado

### 1) Criar uma única fonte de verdade para o payload Bitrix
Arquivos:
- `supabase/functions/_shared/bitrixPayload.ts` (novo)
- `supabase/functions/meta-lead-webhook/index.ts`
- `supabase/functions/make-webhook-proxy/index.ts`

Vou extrair para um helper compartilhado toda a lógica de:
- normalização do crédito pessoal,
- leitura dos dados enriquecidos do lead,
- fallback para leads antigos,
- montagem das variáveis planas do Make.

Esse helper será usado tanto no envio real quanto no teste/manual.

Resultado:
- some a duplicação,
- some a divergência,
- toda correção futura será feita em um só lugar.

### 2) Blindar o crédito pessoal em todos os fluxos
Arquivos:
- `supabase/functions/_shared/bitrixPayload.ts`
- `supabase/functions/meta-lead-webhook/index.ts`
- `supabase/functions/make-webhook-proxy/index.ts`

Será aplicada uma regra única e centralizada:

- `sim_personal_monto_maximo = MIN(teórico, 15000)`
- `sim_personal_cuota_mensual` recalculada sempre com:
  - 84 meses
  - 8% TAE
  - valor final já capado

Também haverá normalização defensiva para leads antigos:
- se no CRM existir `monto_maximo = 35929`,
- o payload enviado ao Make sairá como `15000`,
- e a cuota será recalculada com base em 15k, não no valor antigo.

### 3) Corrigir o payload real do `meta-lead-webhook`
Arquivo:
- `supabase/functions/meta-lead-webhook/index.ts`

Hoje o envio real ainda monta o payload à parte e ainda está incompleto para o seu template. Vou corrigir isso para incluir exatamente os campos esperados, incluindo os que estão faltando no envio real:

- `lead_ciudad_interes`
- `lead_valor_deseado`
- `meta_dni_nie`
- `meta_antiguedad_trabajo`
- `meta_deudas_mensuales`
- `meta_monto_ahorros`
- `meta_vivienda_seleccionada`
- `lead_habitaciones`

Também vou garantir que:
- `sim_hipoteca_valor_max_inmueble` = preço recomendado real `MIN(P1, P2)`
- `sim_hipoteca_cuota_maxima` = cuota real da hipoteca
- `sim_personal_monto_maximo` = no máximo 15.000
- `sim_personal_cuota_mensual` = cuota correta do valor capado

### 4) Fazer o teste Meta usar o mesmo payload da produção
Arquivo:
- `supabase/functions/make-webhook-proxy/index.ts`

O fluxo `test_meta_bitrix_last_lead` passará a usar o mesmo helper compartilhado do envio real.

Isso garante que o teste do Admin e o webhook real do Meta entreguem:
- os mesmos nomes,
- os mesmos cálculos,
- os mesmos fallbacks,
- os mesmos limites.

### 5) Neutralizar a fonte da confusão: o teste legado
Arquivo:
- `supabase/functions/make-webhook-proxy/index.ts`

O fluxo antigo `test_qualified_last_submission` é o que continua gerando exatamente o payload que você mostrou.

Para que isso nunca mais te engane, vou fazer uma das duas coisas de forma segura:
- transformar esse teste em **ping de conexão simples**, sem dados de lead e sem campos financeiros, ou
- manter esse teste, mas com payload explicitamente marcado como legado e sem qualquer semelhança com o payload Bitrix.

A implementação preferida é:
- **teste geral = ping técnico**
- **teste Meta → Bitrix = payload real**

Assim, se você olhar o Make, nunca mais verá um payload antigo achando que é o do Bitrix.

### 6) Aviso visual se os dois webhooks apontarem para o mesmo endpoint
Arquivos:
- `src/pages/AdminSettings.tsx`
- `src/hooks/useAdminSettings.ts`

Se `webhook_makecom_url` e `webhook_meta_bitrix_url` estiverem iguais, a tela vai mostrar um alerta forte informando que:
- dois fluxos diferentes estão indo para o mesmo cenário do Make,
- isso pode misturar payload legado com payload Bitrix,
- e pode gerar exatamente a confusão que aconteceu agora.

Não vou bloquear o uso, mas vou deixar isso impossível de ignorar.

### 7) Melhorar os logs para diagnóstico rápido
Arquivos:
- `supabase/functions/make-webhook-proxy/index.ts`
- `supabase/functions/meta-lead-webhook/index.ts`

Cada envio vai registrar:
- `source`
- tipo do payload
- destino
- campos principais enviados
- valores finais de:
  - `sim_personal_monto_maximo`
  - `sim_personal_cuota_mensual`
  - `sim_hipoteca_monto_financiable`
  - `sim_hipoteca_valor_max_inmueble`
  - `sim_hipoteca_cuota_maxima`

Assim, se houver qualquer discrepância, dá para identificar em minutos se o problema está:
- no botão errado,
- na URL errada,
- no lead antigo,
- ou no cenário do Make.

## O que não será alterado

- Não vou mudar os nomes das variáveis que você já usa no Make
- Não vou mexer no CRM, simulador front ou PDF agora
- Não vou criar migração de banco
- Não vou tocar no fluxo de descualificados
- Os campos extras podem continuar existindo, mas os principais ficarão garantidos

## Resultado esperado depois da correção

Quando você testar o **Meta → Bitrix**, o Make deverá receber o seu formato esperado, com estes campos corretos:

```text
lead_nombre
lead_telefono
lead_email
lead_edad
meta_dni_nie
lead_preferencia_llamada
lead_zona_interes
lead_ciudad_interes
lead_ingresos_mensuales
lead_valor_deseado
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

E não mais isto no teste Bitrix:

```text
fin_ingresos_mensuales
sim_personal_monto
sim_personal_cuota
sim_hipoteca_monto
sim_hipoteca_cuota
plan_fase1_*
plan_fase2_*
```

## Validação final

1. Testar o botão **Probar Meta → Bitrix (payload real)**.
2. Confirmar no Make que o `source` já não é `test_qualified`.
3. Confirmar que chegam os campos do seu template atual.
4. Confirmar que:
   - `sim_personal_monto_maximo <= 15000`
   - `sim_personal_cuota_mensual` bate com 15k/84m/8%
   - `sim_hipoteca_valor_max_inmueble` usa o recomendado real
   - `sim_hipoteca_cuota_maxima` é a cuota real
5. Testar também um lead antigo para garantir que nunca mais reapareçam 36k.

## Escopo técnico

- `supabase/functions/_shared/bitrixPayload.ts` (novo)
- `supabase/functions/meta-lead-webhook/index.ts`
- `supabase/functions/make-webhook-proxy/index.ts`
- `src/pages/AdminSettings.tsx`
- `src/hooks/useAdminSettings.ts`

Sem migração de banco. Foco total em payload, testes, unificação e blindagem definitiva.
