

## Diagnóstico do "carregando sem fim"

Verifiquei a base e os logs:
- 2 uploads recentes (17:34 e 17:35) ficaram em `PROCESSING`, com `request_id` válido da Bewor
- A função `bewor-webhook` **não recebeu nenhuma chamada** (zero logs em horas) — o callback da Bewor não chegou
- Outros uploads de hoje cedo (07:47, 10:08) finalizaram em ~15s normalmente
- O frontend faz polling a cada 5s e nunca desiste → spinner infinito

A integração com a Bewor **funciona** quando o callback chega. O problema é que dependemos 100% do callback e, quando ele falha (rede, fila lenta, etc.), tudo trava. Solução: adicionar um fallback que busca o resultado diretamente da Bewor via GET, e dar uma saída ao usuário quando demora demais.

## Plano (3 arquivos, sem migração, isolado e leve)

### 1. `bewor-public-status/index.ts` — fallback ativo
Quando o registro está `PROCESSING` há mais de **30 segundos** e tem `request_id`:
- Fazer `GET /api/v1/third-party/request/:request_id` na Bewor
- Se retornar `FINISHED`/`COMPLETED`: rodar a mesma lógica de extração + viabilidade já existente no webhook (mover para `_shared/beworExtraction.ts` para reusar nos dois lugares sem duplicar código)
- Atualizar o registro como se o webhook tivesse chegado
- Devolver o status atualizado no mesmo response do polling

Isso resolve **todos** os casos onde o callback da Bewor falha — o próprio polling do cliente recupera o resultado.

### 2. `_shared/beworExtraction.ts` (novo) — código compartilhado
Extrair de `bewor-webhook` as funções:
- `extractIncomeAndDebts(result)`
- `calcularViabilidad(income, debts)`
- `buildViabilidadeWithMetadata(fullResult, viabilidade)` (a parte que adiciona bewor_status, warnings, kos, pages)

Sem alterar comportamento — apenas mover. O webhook continua igual; o status passa a usar as mesmas funções.

### 3. `PublicDocumentUpload.tsx` — UX clara, sem spinner infinito
- Polling para após **2 minutos** (24 tentativas a 5s)
- Quando expira, mostrar card neutro: *"Tu análisis está tardando más de lo habitual. Hemos recibido tu documento correctamente y tu agente lo revisará en breve."* + botão "Subir otro documento"
- Quando `bewor-public-status` retorna `inconclusive` ou `finished`, parar o polling imediatamente (já faz isso, mantém)
- Mensagem durante processamento: indicar tempo estimado ("Esto suele tardar 15-30 segundos")

## O que NÃO toco
- `bewor-public-upload` (envio para Bewor está correto)
- `bewor-webhook` (continua sendo o caminho rápido quando funciona)
- Trigger `auto_generate_bewor_token_on_qualification`, BeworAnalysisTab, simulador, RLS, schema
- Qualquer outra função, hook ou componente

## Resultado esperado
- Os 2 uploads travados (17:34 e 17:35) serão recuperados automaticamente no próximo poll após o deploy
- Uploads futuros sempre terminam: ou pelo callback (rápido) ou pelo fallback GET (em até 30s)
- Cliente nunca mais vê spinner eterno — no pior caso, vê uma mensagem clara após 2 minutos

Mudanças mínimas, sem peso adicional na plataforma (1 GET extra à Bewor só quando passa de 30s sem callback).

