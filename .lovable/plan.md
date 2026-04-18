

## Diagnóstico (3 problemas reais)

**1. Nome do titular guardado como `[object Object]`**
A Bewor devolve `holders: [{ name: "VALDES SANCHEZ CHABELY", idNumber: "" }]` — array de **objetos**. O nosso código faz `holderRaw.join(", ")` assumindo strings → vira literalmente `"[object Object]"`. Por isso também perdemos o DNI (que vem dentro do mesmo objeto) e o nome do banco (que está em `financial_entity_text`, não em `bank`).

**2. Cliente vê resultado vazio "0 €"**
A última análise teve `documentValidated: false` no response do status (porque `holder_name` saiu como `[object Object]` e `bank_name` ficou nulo, então a UI caiu no branch `aprobable === false` que mostra "capacidad limitada"). Era para cair no branch verde "Documento validado".

**3. Não há área dedicada no admin para verificar extractos**
Hoje as análises só são visíveis dentro do modal de cada lead. O utilizador quer uma página única que liste **todas** as verificações feitas com o nome do cliente associado.

## Plano (3 ficheiros + 1 nova página)

### 1. `_shared/beworExtraction.ts` — ler estrutura real da Bewor
- `holders[]` pode ser array de **objetos** `{name, idNumber}` **ou** array de strings (defesa para ambos os formatos)
- Extrair `holder_name` juntando os `name` (string) de cada holder
- Extrair `holder_dni` do **primeiro** `idNumber` não vazio dos holders (bonus: agora capturamos o DNI automaticamente quando vem)
- Extrair `bank_name` priorizando `financial_entity_text` → `financial_entity_normalized` → `bank` (campos reais que a Bewor devolve)
- `buildViabilidadeWithMetadata`: usar a string limpa de holder/bank na mensagem amigável (sem `[object Object]`)

### 2. `bewor-public-status/index.ts` — devolver `documentValidated` corretamente
Adicionar o `documentValidated` e `validatedMessage` ao response também quando `viabilidade.needs_manual_review === true` (hoje só dispara quando alguém define `document_validated` manualmente). Mensagem: *"Hemos recibido tu extracto correctamente (Banco Santander, 9 páginas validadas, titular Chabely). Tu agente lo revisará personalmente."*

### 3. Backfill da linha quebrada (1 query simples)
Reprocessar apenas o registo `61a9158d…` para corrigir `holder_name = "VALDES SANCHEZ CHABELY"`, `holder_dni = ""` (mantém vazio), `bank_name = "Banco Santander"` a partir do JSON cru.

### 4. Nova página `/admin/verificaciones-extractos`
Página dedicada listando **todas** as `lead_document_analysis` (com `lead_id` ou standalone), tabela com:
- Nome do cliente (do `lead.nombre_completo` se houver; senão `holder_name` do documento; senão "Standalone")
- Banco + IBAN mascarado
- Período do extracto, páginas, confidence
- Status badge (OK/WARNING/KO + "Necessita revisão manual" quando `needs_manual_review`)
- Ingressos (auto ou manual), data
- Botão "Abrir lead" (quando vinculado) ou "Ver detalhes" (modal com JSON e campo manual de `monthly_income`)

Adicionar entrada no `AdminSidebar` no grupo "Operacional": **"Verificación de Extractos"** com ícone `FileCheck`.

### 5. Pequeno fix em `BeworAnalysisTab.tsx`
Garantir que se `holder_name` vier como `[object Object]` (registos antigos), mostra fallback "Sem nome".

## O que NÃO toco
- `bewor-public-upload`, `bewor-webhook`, schema, RLS, simulador, lógica de cálculo, trigger automático de token

## Resultado esperado
- Cliente recebe sempre uma mensagem clara: ou "Hipoteca aprobable X €" ou "Documento validado, agente vai revisar"
- Nome e DNI passam a ser guardados corretamente quando a Bewor os envia
- Admin tem painel central `/admin/verificaciones-extractos` com todas as verificações listadas e nome do cliente visível

