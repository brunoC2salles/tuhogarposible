## Garantir que leads do Meta Ads nunca caiam no Housage

### Situação atual
- O agente Housage (`fa5038e7-0e88-49c7-88ae-ac506e12340b`) hoje está com `activo = false`, e o round-robin (`get-next-agent` e o fallback dentro de `meta-lead-webhook`) já filtra por `activo = true`. Então, na prática, leads do Meta Ads não vão para o Housage **enquanto o agente continuar inativo**.
- O risco é futuro: se alguém marcar Housage como `activo = true` no painel para qualquer outro motivo, o round-robin do Meta Ads passaria a considerá-lo.

### Mudanças propostas (defense-in-depth, sem mexer em UI)

1. **`supabase/functions/get-next-agent/index.ts`**
   - Adicionar constante `HOUSAGE_AGENT_ID` e excluir esse id da lista `allAgents` logo após o `select`, antes de qualquer filtro de região / round-robin.
   - Log explícito: `[Round-Robin] Housage excluído do pool (reservado a Tally)`.

2. **`supabase/functions/meta-lead-webhook/index.ts`**
   - No bloco de fallback direto (quando `get-next-agent` falha), adicionar `.neq('id', HOUSAGE_AGENT_ID)` no `select` de profiles, garantindo que o fallback também nunca escolha Housage.
   - No bloco de `force_agent_id`: aceitar `force_agent_id = HOUSAGE_AGENT_ID` **somente** se `source_origin === 'tally_housage'`. Se outro caller tentar forçar Housage sem essa origem, retornar 400 com mensagem clara. Isso impede que um payload Meta Ads (ou qualquer outra fonte) consiga atribuir leads ao Housage acidentalmente ou de propósito.

3. **Sem migrations, sem mudanças de UI, sem mudança no fluxo Tally** — o `tally-housage-webhook` continua funcionando igual porque ele já envia `source_origin: 'tally_housage'` junto com `force_agent_id`.

### Validação
- `curl_edge_functions` no `meta-lead-webhook` com payload Meta normal → confirmar nos logs que o pool de round-robin não contém o id do Housage e que o lead foi atribuído a outro agente.
- `curl_edge_functions` no `tally-housage-webhook` → confirmar que continua atribuindo Housage (porque manda `source_origin: 'tally_housage'`).
- `curl_edge_functions` direto no `meta-lead-webhook` com `force_agent_id = HOUSAGE_AGENT_ID` e **sem** `source_origin` → deve retornar 400.
