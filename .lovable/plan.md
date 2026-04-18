

## Diagnóstico final (a Bewor está OK)

Inspecionei o JSON real retornado dos uploads de ontem:

```
result: "WARNING"  ← Bewor sinaliza problema
pages: 1            ← PDF tinha só 1 página (capa, não extrato)
records: []         ← sem transações para extrair
warning_reasons: [{ code: "W_IBAN_INVALID", description: "IBAN validation failed" }]
iban: "2325356125"  ← 10 dígitos (IBAN válido tem 24)
```

**Conclusão:** Integração está 100% funcional (type, callback_url, JWT, GET resultado, polling, fallback de soma). O problema foi o **PDF enviado**: era um documento de 1 página sem movimentos, não um extrato bancário completo.

Hoje mostramos "crédito 0" sem explicar o porquê. Vamos consertar isso.

## Mudanças (3 arquivos, sem migrações, sem mexer em nada que funciona)

### 1. `bewor-webhook/index.ts` — capturar avisos da Bewor
- Ler `result.result.result` (`"OK"` / `"WARNING"` / `"KO"`) e `warning_reasons[]` / `ko_reasons[]`
- Adicionar ao `viabilidade_sugerida`:
  - `bewor_status`: OK/WARNING/KO
  - `bewor_warnings`: array de descrições legíveis
  - `pages`, `confidence` para diagnóstico
- Quando `result === "KO"` ou warnings críticos, marcar `razon` com mensagem clara: *"El documento no es un extracto bancario válido (X advertencias)"*
- Continua salvando tudo cru no `result` (sem perda)

### 2. `bewor-public-status/index.ts` — informar o cliente
- Retornar campos extras: `bewor_status`, `bewor_warnings`, `pages`
- Quando `bewor_status === "KO"` ou `pages < 2`, marcar `inconclusive: true` **com motivo específico**

### 3. `PublicDocumentUpload.tsx` — UX clara
- **Antes do upload**: aviso visível: *"Sube el extracto completo de los últimos 6 meses (mínimo 4-5 páginas). Documentos parciales no permiten análisis."*
- **Após análise inconclusiva**: substituir mensagem genérica por motivo real, ex.: *"El documento procesado tiene solo 1 página. Para un análisis válido necesitamos el extracto completo."* + botón "Subir otro documento"

### 4. `BeworAnalysisTab.tsx` — agente vê tudo
- Acima do fallback OCR já existente, adicionar bloco "Avisos del análisis Bewor" com:
  - Badge do status (OK verde / WARNING amarelo / KO vermelho)
  - Lista de `warning_reasons` traduzida (W_IBAN_INVALID → "IBAN inválido", etc.)
  - Sugestão de ação (ex: "Pedir al cliente el extracto completo de los últimos 6 meses")

## O que NÃO toco
- Migrações (nenhuma necessária — campos já existem em `result` JSONB)
- `bewor-public-upload` (envio está correto conforme Postman)
- Trigger automático, webhook Make/Bitrix, simulador, RLS, hooks de leads
- Lógica de cálculo de viabilidade (continua igual quando há records)

## Resultado esperado
- Cliente que subir PDF inválido vê **por quê** e pode reenviar
- Agente vê semáforo + avisos Bewor + dados crus do OCR num único painel
- Quando o cliente subir extrato real (com transações), o cálculo automático funcionará como sempre projetado

Implementação leve: ~3 edges + 2 componentes UI, sem novas dependências, sem migrações.

