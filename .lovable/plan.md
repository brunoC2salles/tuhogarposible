

## Diagnóstico

A Bewor está a devolver o documento como **OK** (confidence 96.77%, 9 páginas, banco Santander, IBAN válido, titular extraído), mas com `records: []` — ou seja, está a fazer apenas **validação documental**, não está a extrair as transações individuais.

Há também um **bug** no nosso código: lemos `pages` do sítio errado e por isso a mensagem diz "1 página" quando na realidade são 9. Isso é mentira para o cliente.

**O que conseguimos extrair sempre que `result: OK`:**
- Nome completo do titular
- IBAN + banco + validação SEPA
- Período do extracto
- Páginas + confidence
- DNI/NIE: Bewor devolve `idNumber: ""` neste tipo de pedido (não vem no PDF). Fica vazio e o agente preenche manualmente.

**Ingressos mensuales:** sem `records` não há cálculo possível. Precisamos investigar com a Bewor se há um `type` diferente que extraia transações (ex.: `extracto_completo`), mas isso fica para depois — agora vamos parar de mentir e mostrar tudo o que já temos.

## Plano (3 ficheiros + 1 migração leve)

### 1. Migração — guardar dados estruturados
Adicionar a `lead_document_analysis`:
- `holder_name TEXT`
- `holder_dni TEXT`
- `iban TEXT`
- `bank_name TEXT`
- `period_start DATE`
- `monthly_income NUMERIC` (nullable, preenche quando há records)

Sem alterar nada existente. Backfill dos 3 registos atuais a partir do `result` JSONB.

### 2. `_shared/beworExtraction.ts` — corrigir bug das páginas + extrair dados estruturados
- **Corrigir** leitura de `pages`: usar `innerResult.pages` (correto) em vez de cair em `docFields.pages` (sempre 0).
- Adicionar `extractStructuredData(fullResult)` que devolve `{ holder_name, holder_dni, iban, bank_name, period_start }`.
- `buildViabilidadeWithMetadata`: quando `result: OK`, `records: []` e `income: 0`, mudar `razon` para mensagem honesta: *"Documento validado correctamente (Banco X, titular Y, 9 páginas). El sistema no extrajo movimientos individuales — el agente revisará el PDF para calcular ingresos."*

### 3. `bewor-webhook/index.ts` + `bewor-public-status/index.ts` — gravar campos novos
Em ambos os pontos onde fazemos `update` em `lead_document_analysis`, gravar também as novas colunas estruturadas.

### 4. `BeworAnalysisTab.tsx` — mostrar dados ao agente
Já temos o fallback OCR. Refinar:
- Card "Datos extraídos del documento" mais destacado (titular, DNI manual, IBAN, banco, período, páginas, confidence)
- Campo editável para DNI/NIE (o agente preenche e guardamos em `holder_dni`)
- Campo editável para `monthly_income` (o agente analisa o PDF e introduz manualmente)
- Botão "Guardar dados extraídos no lead" (atualiza o `leads.nombre_completo` se vazio, guarda DNI no checklist se quiseres)

### 5. `PublicDocumentUpload.tsx` — mensagem honesta ao cliente
Quando `result: OK` mas `records: []`:
- Substituir *"Documento incompleto"* por: *"Hemos recibido tu extracto correctamente (Banco X, 9 páginas validadas). Tu agente lo revisará personalmente y te confirmará los términos en breve."*
- Não pedir para reenviar — o documento está válido.

## O que NÃO toco
- `bewor-public-upload` (envio Bewor está correto)
- Trigger automático, webhook Make/Bitrix, simulador, RLS, schema dos leads
- Lógica de cálculo de viabilidade quando há `records` (continua a funcionar)

## Resultado esperado
- Bug das "1 página" eliminado
- Cliente vê mensagem real e tranquilizadora quando o PDF está válido
- Agente vê todos os dados que a Bewor extraiu, edita DNI e ingressos manualmente
- Tudo fica guardado em colunas pesquisáveis para futuros relatórios

## Pergunta para ti antes de avançar
Queres que o **botão "Guardar no lead"** atualize automaticamente o `leads.nombre_completo` (caso esteja diferente) ou prefires que apenas guarde os dados em `lead_document_analysis` para o agente decidir?

