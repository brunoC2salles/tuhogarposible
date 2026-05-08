# Plano — Webhook dedicado Tally → Housage

## Objetivo
Criar um endpoint exclusivo no portal para receber leads do novo formulário Tally (via Make HTTPS) e atribuí-los **sempre** ao agente Housage (`fa5038e7-0e88-49c7-88ae-ac506e12340b`), sem passar pelo round-robin.

## Arquitetura

```text
Tally form → Make (HTTP node) → POST https://<supabase>/functions/v1/tally-housage-webhook
                                            ↓
                                 Insert em `leads` com agente_asignado_id = Housage
                                            ↓
                                 (mesmas notificações usadas pelo meta-lead-webhook)
```

## O que será criado

### 1. Edge function `supabase/functions/tally-housage-webhook/index.ts`
- Endpoint público (`verify_jwt = false`), CORS aberto.
- Aceita POST com payload flexível do Tally/Make. Campos esperados (todos opcionais exceto nome+contato):
  - `nombre_completo` / `nombre` / `name`
  - `email`
  - `telefono` / `phone`
  - `ciudad_interes`, `zona_interes`, `valor_inmueble_deseado`, `notas`
  - Aceita também o formato cru do Tally (`fields: [{label, value}]`) com mapeamento por label.
- Validação mínima: precisa de pelo menos email **ou** telefone + nome.
- Insere em `leads` com:
  - `agente_asignado_id = 'fa5038e7-0e88-49c7-88ae-ac506e12340b'` (constante hardcoded — Housage)
  - `source = 'manual'` (enum existente; não há valor `tally` no enum atual e evitamos migration)
  - `notas` prefixado com `[Tally Housage]` para rastreabilidade
  - `stage = 'nuevo_lead'` (default)
- Resposta JSON `{ ok: true, lead_id }` (200) ou `{ ok: false, error }` (400/500).
- Logs em console para debug via Supabase logs.

### 2. Sem alterações em DB
- Housage já existe em `profiles`. **Não** o reativamos agora — você pediu para conectar primeiro e ativar depois.
- ⚠️ Importante: como o agente está `activo = false`, ele aparecerá em queries que filtram ativos (ex: lista de agentes na UI), mas isso **não impede** que ele seja dono dos leads — o webhook insere o `agente_asignado_id` diretamente. Quando você quiser, basta marcar `activo = true` no painel de agentes.

### 3. Sem alterações em UI
- Os leads aparecem normalmente no Kanban / AdminCRM / modal de leads do Housage.

## URL para colar no Make
Após o deploy automático:
```
https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/tally-housage-webhook
```
- Method: `POST`
- Header: `Content-Type: application/json`
- Não precisa de Authorization.

## Fora do escopo
- Reativar o Housage (faremos depois, manualmente).
- Adicionar `tally` ao enum `lead_source` (evita migration; `notas` já marca a origem).
- Webhook de saída para Make/Bitrix nesta inserção (replicar fluxo do meta-lead-webhook pode ser feito num passo futuro se você quiser).

## Como testar depois do deploy
Posso disparar um POST de teste com `curl_edge_functions` simulando o payload do Make e confirmar que o lead aparece atribuído ao Housage.
