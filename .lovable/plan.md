
# Plano — Tally → mesmo pipeline do Meta Ads (forçando Housage)

## Diagnóstico
Hoje o `tally-housage-webhook` faz só um INSERT cru em `leads`. Isso quebra:
- qualificação (não roda `qualificarLead`)
- simulador personal e hipotecário (campos `simulador_personal_data` / `simulador_hipotecario_data` ficam vazios)
- payload Bitrix para o Make
- normalização de zona/região, ingresos, ahorros, edad, etc.

A imagem do Tally confirma: as perguntas são **idênticas** às do form Meta Ads. Logo, o caminho certo é fazer o Tally entregar o **mesmo objeto** que o Meta Ads consome e reusar o pipeline existente.

## Estratégia
1. `tally-housage-webhook` vira só um **adaptador**: recebe payload do Tally (formato `fields[]` ou flat do Make), normaliza para o shape `MetaLeadData` e **encaminha** para `meta-lead-webhook` com uma flag `force_agent_id = Housage`.
2. `meta-lead-webhook` ganha suporte opcional a `force_agent_id` no body: se vier preenchido, pula o round-robin e atribui esse agente direto (mesmo que `activo = false`). Tudo o resto (qualificação, simuladores, notas, Bitrix payload, webhook de saída) roda igual ao Meta Ads.

Assim, leads do Tally e do Meta Ads passam pelo **mesmo código** — nada de divergência futura.

## Mapeamento de campos Tally → MetaLeadData
Baseado na imagem anexada:

| Label Tally | Campo interno (igual Meta Ads) |
|---|---|
| Nombre | `nombre` |
| Correo | `email` |
| Telefono | `telefono` |
| Edad | `edad` |
| ¿Cuánto tiempo llevas en tu trabajo actual? | `antiguedad_trabajo` |
| ¿Tiene NIE o DNI? | `tiene_nie_dni` |
| ¿Te encuentras en un fichero de morosidad? | `en_fichero_morosidad` |
| ¿Cuando prefieres que te llamamos? | `preferencia_llamada` |
| ¿En que zona quieres vivir? | `zona_interes` |
| Rango de ingresos neto mensuales del hogar | `rango_ingresos` |
| ¿Cuánto pagas mensualmente de crédito/deuda? | `deudas_mensuales` |
| Numero de habitaciones que buscas | `habitaciones` |
| ¿Cuentas con ahorros para los impuestos? | `tiene_ahorros_impuestos` |
| ¿Cuánto? (ahorros) | `monto_ahorros` |
| ¿Cuentas con la vivienda seleccionada? | `tiene_vivienda_seleccionada` |

O adaptador aceita matching tolerante por label (lowercase + sem acentos + sem pontuação) e também aceita o payload já flat do Make.

## Mudanças em código

### 1) `supabase/functions/tally-housage-webhook/index.ts` — reescrita completa
- Parse do payload Tally (suporta `{fields:[{label,value}]}`, `{data:{fields:[...]}}` e payload flat).
- `LABEL_MAP` ampliado conforme tabela acima.
- Monta objeto `MetaLeadData` exatamente como o Meta envia.
- Faz `fetch` interno para `meta-lead-webhook` passando `force_agent_id: HOUSAGE_AGENT_ID` e marca `source_origin: 'tally_housage'` para rastreio nas notas.
- Retorna o JSON do meta-lead-webhook (`{ success, lead_id, ... }`).

### 2) `supabase/functions/meta-lead-webhook/index.ts` — alterações pontuais
- Aceitar campos extras opcionais do body: `force_agent_id?: string` e `source_origin?: string`.
- Se `force_agent_id` presente:
  - Pular round-robin / fallback.
  - Buscar `profiles` por id (sem filtro `activo`) e usar como `agenteAsignado`.
  - Se não encontrar, retornar 400 com erro claro.
- Prefixar `notas` com `[Tally Housage]` quando `source_origin === 'tally_housage'` (mantém o resto do fluxo intacto: qualificação, simuladores, JSON enriquecido, Bitrix payload, webhook Make, notificações).
- `source` no insert continua `meta_ads` (enum existente; mantém estatísticas) — o rastreio fica nas notas. Alternativa se preferir: continuar `manual` para Tally; podemos decidir junto.

### 3) Sem migrations
- Nenhuma alteração de schema. Housage continua `activo = false` até você ativar.

## URL para o Make (sem mudanças)
```
POST https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/tally-housage-webhook
Content-Type: application/json
```

## Como validar depois do deploy
- Disparar `curl_edge_functions` para `tally-housage-webhook` com um payload Tally simulado completo.
- Conferir nos logs do `meta-lead-webhook` que rodou qualificação + simuladores.
- Conferir no CRM que o lead apareceu atribuído ao Housage com `simulador_personal_data` e `simulador_hipotecario_data` preenchidos.

## Decisões pendentes (rápidas)
1. `source` no insert para leads Tally: `meta_ads` (mistura nas métricas) **ou** `manual` (separa nas métricas, prefixo `[Tally Housage]` nas notas para identificar)?
2. Ao receber lead Tally **descualificado**, queremos mesmo assim atribuir ao Housage (mesmo comportamento do Meta), ou deixar sem agente como hoje os descualificados?

Se você não responder, sigo com: `source = 'manual'` + atribui Housage **sempre** (qualificado ou não), pois o pedido original foi "todo lead deste form vai para o Housage".
