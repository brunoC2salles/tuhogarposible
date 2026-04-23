# Plano: restaurar o payload Bitrix completo + manter os 4 cálculos corrigidos

## Diagnóstico do que aconteceu

Nas últimas iterações, ao "unificar" o builder, eu **enxuguei** o payload e perdi vários campos que você sempre usou no Make. O builder atual em `_shared/bitrixPayload.ts` envia só ~22 campos, quando o seu template do Bitrix espera muitos mais.

Você **não precisa trocar a URL do webhook** — continua a mesma. O problema é só o conteúdo do payload.

## O que vou restaurar (campos que voltam ao payload)

Vou **adicionar de volta** todos os campos do template original que sumiram, mantendo nomes idênticos aos que você já usa no Bitrix:


| Campo Bitrix                                  | Origem                                                                |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `lead_nombre`                                 | já existe                                                             |
| `lead_telefono`                               | já existe                                                             |
| `lead_email`                                  | já existe                                                             |
| `lead_edad`                                   | já existe (extraído de notas)                                         |
| `lead_documento`                              | **restaurar** — alias de `meta_dni_nie`                               |
| `meta_dni_nie`                                | já existe                                                             |
| `lead_preferencia_llamada`                    | já existe                                                             |
| `lead_zona_interes`                           | já existe                                                             |
| `lead_ciudad_interes`                         | já existe                                                             |
| `lead_ingresos_mensuales`                     | já existe                                                             |
| `lead_valor_deseado`                          | já existe                                                             |
| `meta_deudas_mensuales`                       | já existe                                                             |
| `lead_habitaciones`                           | já existe                                                             |
| `lead_numero_de_viviendas`                    | **restaurar** — extrair de notas (`Habitaciones` ou campo dedicado)   |
| `lead_disponibilidad`                         | **restaurar** — extrair de notas (`Preferência de chamada` / horário) |
| `meta_monto_ahorros`                          | já existe                                                             |
| `meta_tiene_ahorros`                          | já existe                                                             |
| `meta_vivienda_seleccionada`                  | já existe                                                             |
| `meta_antiguedad_trabajo`                     | já existe                                                             |
| `sim_hipoteca_monto_financiable`              | já existe — **com cálculo novo**                                      |
| `sim_hipoteca_valor_max_inmueble`             | já existe — **MIN(P1, P2) novo**                                      |
| `sim_hipoteca_cuota_maxima`                   | já existe — **cuota real nova**                                       |
| `sim_personal_monto_maximo`                   | já existe — **sempre 15.000€**                                        |
| `sim_personal_cuota_mensual`                  | já existe — **84m, 8% TAE**                                           |
| `agente_*`                                    | já existe                                                             |
| `crm_url`, `bewor_link_documentos`, `recom_*` | já existem                                                            |


## O que NÃO muda (intocado)

- A URL do webhook continua a mesma — você não precisa mexer no Make.
- Os 4 valores corrigidos (hipoteca máxima, cuota hipoteca real, crédito pessoal 15k, cuota crédito pessoal 84m/8%) **permanecem corrigidos**.
- Nomes das variáveis que você já usa no template Bitrix: idênticos.
- Banco de dados: nenhuma migração.
- CRM, simulador, PDF: intocados.

## O que vou tocar

**Único arquivo: `supabase/functions/_shared/bitrixPayload.ts**`

Vou expandir o `buildBitrixPayloadFromLead` para:

1. Adicionar de volta `lead_documento`, `lead_numero_de_viviendas`, `lead_disponibilidad` (extraindo das notas com fallbacks seguros).
2. Manter todos os campos atuais, incluindo os 4 cálculos corretos já blindados.
3. Manter o teto de 15.000€ duro no crédito pessoal e a cuota recalculada (84m, 8% TAE) — inclusive normalizando leads antigos.

Como o `meta-lead-webhook` e o `make-webhook-proxy` (botão "Probar Meta → Bitrix") **já usam o mesmo helper**, basta corrigir num único lugar e os dois fluxos passam a enviar o payload completo idêntico.

## Validação após o deploy

1. Clicar em **"Probar Meta → Bitrix (payload real)"**.
2. Confirmar no Make que aparecem todos os campos do seu template Bitrix (incluindo `lead_documento`, `lead_numero_de_viviendas`, `lead_disponibilidad`).
3. Confirmar que `sim_personal_monto_maximo ≤ 15000` e os 4 valores de hipoteca/crédito batem com o simulador.

## Pergunta rápida antes de tocar

Para `lead_numero_de_viviendas` e `lead_disponibilidad`, **qual era exatamente a origem do dado original** que você usava antes? Eu identifiquei estas opções nas notas dos leads do Meta:

- `lead_numero_de_viviendas` → vem de `Habitaciones:` (mesmo valor do `lead_habitaciones`)? Ou era um campo separado tipo "cuántas viviendas viste"?
- `lead_disponibilidad` → vem de `Preferência de chamada:` (mañana/tarde/noche)? Ou era outro campo (dia da semana, horário específico)?

Se confirmar isso (ou disser "use o mesmo da `Preferência de chamada` e do `Habitaciones`"), faço o ajuste e nada mais muda no resto do payload.