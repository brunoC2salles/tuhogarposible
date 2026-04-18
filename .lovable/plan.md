

## Diagnóstico

**1. Mensagem do simulador (página `/documentos/:token`)**
Em `PublicDocumentUpload.tsx` (linhas 230-241), após o OCR finalizar mostro:
- "Tu agente revisará el resultado"
- "Te contactaremos en breve" / "Tu agente analizará el resultado"

O cliente NÃO vê o veredito (aprobable / hipoteca máxima / cuota máx). Vou substituir por um card com o resultado direto.

**2. Bewor "crédito 0"**
PDFs subidos ontem (Antonio: 1 página, Chabely: 9 páginas Santander) retornaram `records: []` → `income=0, debts=0` → veredito "crédito máximo 0".

A causa é o `type: "movimientos_bancarios"` que estamos enviando. A Bewor processou os PDFs (status FINISHED, confidence 94-96%, IBAN/holder/banco extraídos), mas **não extraiu transações** porque esse `type` provavelmente faz só validação documental, não OCR de movimentos.

**Preciso da sua coleção Postman** para confirmar:
- O `type` correto para extração de movimentos (provavelmente `"extracto_bancario"` ou similar)
- Se há flag adicional (`extract_records`, `deep_analysis`, etc.)
- Endpoint correto (atual: `POST /api/v1/third-party/request`)

Enquanto isso o fallback será mostrar dados crus do OCR no agente.

**3. Fallback de viabilidade (resposta sua)**
Quando `records=[]` ou `income=0`, mostrar bloco com dados crus extraídos (titular, IBAN, banco, páginas, confidence) no `BeworAnalysisTab`, em vez de calcular viabilidade fake.

## Plano de Implementação

### Fase 1 — Mostrar veredito ao cliente (simples, sem risco)

**`PublicDocumentUpload.tsx`** — substituir o bloco "Tu agente revisará":
- Quando `statusFlow === "finished"` e há dados de viabilidade, mostrar:
  - Badge: "✓ HIPOTECA APROBABLE" (verde) ou "Análisis recibido" (neutro se inconclusivo)
  - Hipoteca máxima estimada (€)
  - Cuota mensual máxima (€)
  - Pequeno disclaimer: "Estimación basada en OCR. Tu agente confirmará los términos finales."
- Quando OCR não conseguiu extrair (ingresos=0, records=[]), mostrar mensagem neutra: "Documento recibido y analizado. Tu agente revisará los datos contigo." (não mentir dizendo "0 €")

**`bewor-public-status/index.ts`** — já retorna `aprobable`. Adicionar também: `hipoteca_maxima`, `cuota_max`, `inconclusive` (true se ingresos=0).

### Fase 2 — Fallback agente (BeworAnalysisTab)

**`BeworAnalysisTab.tsx`** — quando `viabilidade.ingresos_detectados === 0`:
- Esconder semáforo de viabilidade
- Mostrar card "OCR no detectó movimientos — datos extraídos del documento":
  - Titular (do `result.document_fields.holders`)
  - IBAN + banco (se válido)
  - Período do extrato (`period_start_date`)
  - Páginas processadas + confidence
  - Botão "Descargar PDF original" (já existe)
- Aviso ao agente: "Posiblemente el `type` enviado a Bewor es para validación documental, no extracción de transacciones. Revisar configuración."

### Fase 3 — Bewor type correto (BLOQUEADO até receber Postman)

Aguardo você reenviar a coleção Postman. Quando tiver:
- Atualizo o `type` em `bewor-public-upload/index.ts`
- Adiciono flags se necessário
- Fallback de Fase 2 continua útil para erros futuros

**Não vou tocar** em nenhum outro arquivo, hook, trigger, webhook Make/Bitrix, simulador interno, ou na lógica de geração automática de tokens — tudo isso já funciona.

## O que NÃO mexo (proteção contra regressão)

- Trigger `auto_generate_bewor_token_on_qualification`
- Webhook `make-webhook-proxy` (Bitrix)
- `ResultadosSimulacionHipotecaria` / `ResultadosCombinados` (já mostram veredito)
- Simulador interno do agente
- RLS, schema, hooks de leads
- Edge function `bewor-admin-token` (JWT está OK)

## Próximo passo

Implemento Fase 1 + Fase 2 imediatamente após sua aprovação (são mudanças isoladas e seguras). A Fase 3 fica pendente até você me reenviar a coleção Postman da Bewor — sem ela, qualquer mudança no `type` é chute e pode quebrar o que já funciona parcialmente.

