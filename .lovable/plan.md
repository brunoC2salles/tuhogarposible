

## Diagnóstico provado

Confirmei diretamente no JSON real devolvido pela Bewor (request `019da1dc-f56c…`):
- ✅ Conexão Bewor: **100% correcta** (HTTP 200, request_id válido, status `OK`, confidence 95.65%)
- ✅ Validação documental: funciona (banco, IBAN, titular, período extraídos)
- ❌ Financial extraction: `records: []`, `financial_alerts: []`, `idNumber: ""` — **completamente vazios**

A Bewor está a devolver "OK" mas só o módulo de **validação documental**. O type `movimientos_bancarios` que enviamos não está a accionar o motor financeiro de extracção de records (que é o que calcularia ingressos/deudas/capacidade automaticamente).

A documentação pública da Bewor (`/docs`, `/swagger`) não existe. Sem testar variantes, não sei se basta mudar o `type` ou se falta um parâmetro extra (ex.: `extract_records`, `analysis_level=full`) ou se a tua conta precisa de ter o módulo financeiro activado pela Bewor.

## Plano (3 fases — ordem importa)

### Fase 1 — Descobrir o type correcto (1 ficheiro, instrumentação)

**`bewor-public-upload/index.ts`**: adicionar variável de ambiente `BEWOR_REQUEST_TYPE` (default `"movimientos_bancarios"`) que controla o type enviado. Ao receber a resposta da Bewor, logar **toda** a estrutura devolvida + tentar fazer uma 2ª chamada `GET /third-party/types` (se existir) para listar os types suportados pela conta. Logs ficam visíveis no Edge Function dashboard.

**Acção tua:** depois do deploy, fazer 1 upload de teste — vou ler os logs e ver:
- Que types a Bewor diz que tens disponíveis
- Que campos a Bewor sabe extrair

Se aparecer um type diferente que devolve records (ex.: `cashflow`, `financial_analysis`, `extract_full`), mudo o env var e está resolvido. Se não houver, **a Bewor não está a calcular** — precisas de pedir ao suporte deles para activar o módulo. Aviso-te no momento.

### Fase 2 — Mostrar o que a Bewor REALMENTE devolve (sem inventar)

Independentemente da Fase 1, ajusto **`/admin/verificaciones-extractos`** para mostrar todos os campos que a Bewor devolve hoje + os novos quando vierem (records, ingressos, deudas, capacidade calculada por eles). Adiciono colunas: ingressos detectados, capacidade Bewor, nº de records.

### Fase 3 — Mensagem ao cliente honesta + limpeza CRM

**`PublicDocumentUpload.tsx`**: 
- Quando Bewor devolve cálculo completo (records > 0 ou `aprobable === true`): mostro o resultado real (hipoteca máxima, cuota máxima)
- Quando Bewor só valida sem extrair (records = 0): substituo a mensagem actual ("agente vai revisar") por: **"Hubo un problema procesando tu extracto. Por favor, contacta con tu agente para que te ayude a subir el documento correcto."** com ícone de alerta + botão "Subir otro documento"
- Removo a mensagem "Documento validado" verde quando não há cálculo

**`AdminCRM.tsx`**: removo `<StandaloneAnalysisPanel />` e `<StandaloneDocsButton />` do header. A funcionalidade standalone já está acessível via `/admin/verificaciones-extractos`.

## Ficheiros tocados (4 no total)
1. `supabase/functions/bewor-public-upload/index.ts` — instrumentação + suporte a types via env
2. `src/pages/admin/VerificacionesExtractos.tsx` — colunas extra (records, capacidade Bewor)
3. `src/pages/PublicDocumentUpload.tsx` — mensagem de erro honesta quando não há cálculo
4. `src/pages/inventario/AdminCRM.tsx` — remover painel + botão standalone

## O que NÃO toco
- Schema da BD (já tem todas as colunas necessárias)
- `bewor-webhook` ou `bewor-public-status` (extracção já funciona, só precisa do type correcto)
- Simulador, RLS, qualquer outra função
- `useStandaloneAnalysis`/`useStandaloneTokens` ficam — só removo o uso no AdminCRM (mantém a página `/admin/verificaciones-extractos`)

## Resultado esperado
- **Após Fase 1 + teste tu**: vou-te dizer com certeza se a conta Bewor faz cálculo automático ou se é preciso pedir-lhes activação do módulo financeiro
- Se sim: cliente vê cálculo real, painel admin mostra ingressos/capacidade calculados pela Bewor, zero código novo de cálculo do nosso lado
- Se não: cliente vê mensagem honesta ("contacta o teu agente"), tu sabes a verdade e podes decidir contactar a Bewor — sem mais ilusões de "documento validado" quando a verdade é que falta extracção

## Pergunta única antes de implementar
**Concordas com esta ordem?** Primeiro instrumentar para descobrir a verdade da Bewor (ainda hoje, com 1 upload teu), depois ajustar UI conforme o que descobrirmos. Em alternativa posso ir já directo à mensagem honesta de erro + remoção do CRM standalone (Fase 2 e 3) sem investigar a Bewor — mas aí ficamos sem cálculo automático para sempre, a menos que tu próprio fales com o suporte deles.

