

# Plano: limpar e simplificar o payload enviado ao Make/Bitrix

## Objectivo

Reduzir o payload do `make-webhook-proxy` aos 4 campos de simulação que pediste + dados essenciais do lead/agente. Remover toda a lógica antiga de "plan de pagos por fases" e campos auxiliares de hipoteca que já não fazem sentido.

## Os 4 campos de simulação que ficam

Todos lidos do `simulador_hipotecario_data` (jsonb) que já guardamos no lead — sem recalcular nada na edge function:

| Campo no payload Make | Origem (jsonb do lead) | Notas |
|---|---|---|
| `sim_hipoteca_monto_financiable` | `simulador_hipotecario_data.monto_maximo_financiable` | Hipoteca máxima a financiar (hoje já respeita a lógica nova: cuota 35% × factor francês, sem cap antigo de 180k/210k porque o simulador unificado e o `meta-lead-webhook` ontem já passaram a usar a nova fórmula) |
| `sim_hipoteca_cuota_maxima` | `simulador_hipotecario_data.cuota_maxima_mensual` | Cuota máxima da hipoteca (35% × ingresos disponibles, calculada com fórmula francesa real) |
| `sim_hipoteca_precio_max_inmueble` | `simulador_hipotecario_data.precio_maximo_inmueble` | **Bonus**: o `MIN(P1, P2)` que fizemos ontem — preço final do imóvel que o cliente pode comprar (já existia, mantém-se) |
| `sim_personal_credito_max` | `simulador_hipotecario_data.credito_personal_maximo` | Crédito pessoal máximo (sempre com teto 15.000€, fórmula `(15k + ahorros)/2`) |
| `sim_personal_cuota_mensual` | `simulador_personal_data.cuota_mensual` (fallback `cuotaMensual`) | Cuota mensal do crédito pessoal (84 meses, TAE 8%, ~234€ quando bate no teto 15k) |

São 5 campos no total (os 4 que pediste + o `precio_max_inmueble` que já tinha sido aprovado ontem e é útil para o agente em Bitrix).

## O que se remove do payload

**Todos os campos da função `calcularPlanPagos` (lógica antiga de 2 fases — já não faz sentido com teto de 15k):**
- `plan_fase1_cuota_total`
- `plan_fase1_duracion_meses`
- `plan_fase2_cuota_total`
- `plan_fase2_duracion_meses`
- `plan_ahorro_mensual_tras_personal`
- `plan_total_coste`
- `plan_gap_calculado`
- `plan_ahorros_cliente`
- `sim_personal_monto_financiado`

**Campos auxiliares antigos de hipoteca/personal que já não interessam ao Make:**
- `sim_hipoteca_valor_max_inmueble` (substituído pelo `precio_max_inmueble`)
- `sim_hipoteca_capital_necesario`
- `sim_hipoteca_plazo_anos`
- `sim_hipoteca_aprobable`
- `sim_hipoteca_precio_max_por_ahorros` (P1 isolado — só interno)
- `sim_hipoteca_precio_max_por_ingresos` (P2 isolado — só interno)
- `sim_personal_monto_maximo` (renomeado para `sim_personal_credito_max`)
- `sim_personal_plazo_meses`
- `sim_personal_aprobado`
- `sim_personal_monto`, `sim_personal_cuota`, `sim_personal_plazo`, `sim_personal_tae` (variantes antigas em `send_qualified_submission`)
- `sim_hipoteca_monto`, `sim_hipoteca_cuota`, `sim_hipoteca_plazo`, `sim_hipoteca_capital` (variantes antigas em `send_qualified_submission`)

## O que NÃO se toca

- ✅ Dados do lead: `lead_nombre`, `lead_email`, `lead_telefono`, `lead_edad`, `lead_ingresos_mensuales`, `lead_ciudad_interes`, `lead_zona_interes`, `lead_valor_deseado`, `lead_habitaciones`
- ✅ Dados do agente: `agente_id`, `agente_nombre`, `agente_email`, `agente_telefono`, `agente_tidycal`
- ✅ Campos Meta Ads: `meta_*` (antiguedad, dni_nie, tiene_ahorros, monto_ahorros, vivienda_seleccionada, preferencia_llamada)
- ✅ Recomendações: `recom_1_*`, `recom_2_*`, `recom_3_*`
- ✅ `crm_url`, `bewor_link_documentos`, `timestamp`, `source`, `lead_id`, `cualificado`
- ❌ `meta-lead-webhook` (não tocar — é outro webhook, fica como está)
- ❌ Lógica do simulador (`simuladorUtils.ts`) e dados guardados na BD — tudo intacto
- ❌ Schema da BD — zero migrações

## Ficheiro tocado

**`supabase/functions/make-webhook-proxy/index.ts`** (1 só ficheiro)

### Alterações pontuais:

1. **Apagar `calcularPlanPagos`** (linhas 73-99) e a importação `extractFromNotes` que ela usa para `Ahorros para impuestos` continua a ser usada noutros sítios (mantém-se).

2. **`send_qualified_submission`** (action 1, linhas ~196-244):
   - Substituir os 8 campos `sim_personal_*` e `sim_hipoteca_*` antigos pelos 5 novos.
   - Remover spread `...calcularPlanPagos(...)` (não existe aqui ainda mas verificar).

3. **`test_qualified_last_lead`** (action 2, linhas ~319-350):
   - Substituir os 4 campos `sim_*` antigos pelos 5 novos.
   - Remover `...calcularPlanPagos(simPersonal, simHipoteca, lead.notas)`.

4. **`test_meta_bitrix_last_lead`** (action 3, linhas ~461-524):
   - Manter os campos do lead, agente, meta_*, recom_*.
   - Substituir bloco `sim_personal_*` + `sim_hipoteca_*` (linhas 492-510) pelos 5 novos.
   - Remover `...calcularPlanPagos(simPersonal, simHipoteca, lead.notas)`.

5. **`send_lead_assignment`** (action 4, linhas ~642-685):
   - Mesma substituição: 5 campos novos, sem `calcularPlanPagos`.

## Detalhes técnicos

- **Performance**: paylload mais pequeno → menos latência de rede e parsing no Make.
- **Retro-compatibilidade**: O Make.com vai ter de ser ajustado para usar os novos nomes (`sim_personal_credito_max` em vez de `sim_personal_monto_maximo`). Como o user pediu explicitamente para limpar, assumo que vai actualizar o cenário Make.
- **Nomes finais propostos**:
  - `sim_hipoteca_monto_financiable`
  - `sim_hipoteca_cuota_maxima`
  - `sim_hipoteca_precio_max_inmueble`
  - `sim_personal_credito_max`
  - `sim_personal_cuota_mensual`
- **Ordem de fallback** (para leads antigos sem os campos novos): tenta `monto_maximo_financiable` → `montoFinanciable` → 0. Idem para os outros.
- **Edge case**: se `simulador_hipotecario_data` for null (lead manual sem simulação), todos os 5 campos vão a 0 — Make decide se ignora.

## Validação

Após o deploy, dispara o "Probar con Último Lead" no Admin Settings e confere no log do Make que só chegam os 5 campos novos + dados do lead/agente. Comparas com o screenshot que enviaste para validar que `plan_fase1_*` e companhia desapareceram.

## Entrega

1 ficheiro tocado (`make-webhook-proxy/index.ts`), deploy automático, sem migrações. Reversível em segundos.

