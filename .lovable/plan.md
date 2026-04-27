Diagnóstico

O problema não é que os PDFs sejam ilegíveis. Eu consegui validar os dois anexos:

- CaixaBank: o PDF tem texto/tabelas extraíveis, titular, IBAN, período e movimentos aparecem corretamente.
- ING: também tem texto extraível, IBAN, titular/NIE, período, saldo final, movimentos e uma nómina detectável.

O bloqueio real está antes da leitura financeira: a chamada ao Lovable AI está sendo recusada com HTTP 400 por causa do schema de tool calling enviado no backend. O log exato diz:

```text
GenerateContentRequest.tools[0].function_declarations[0].parameters.properties[titulares].items.required[0]: property is not defined
```

Isso significa que o provider está validando o schema de forma mais estrita: dentro de `titulares.items.required`, existem campos obrigatórios que ele considera não definidos no objeto. Na prática, o modelo nem chega a analisar o texto do PDF; por isso o admin fica sem `result`, sem `extracted_financials` e sem `viabilidade_sugerida`.

Plano de correção

1. Corrigir o schema estruturado enviado ao Lovable AI
- Em `supabase/functions/_shared/internalStatementAnalysis.ts`, tornar o schema de `titulares.items` totalmente compatível com Gemini/Lovable AI.
- Incluir nos `required` todos os campos definidos em `properties` do holder, incluindo os campos de texto opcionais que hoje existem em `properties` mas não estão em `required`.
- Como o schema usa `additionalProperties: false`, todos os campos esperados precisam estar definidos e coerentes.
- Manter strings vazias para dados desconhecidos e a normalização posterior para `null`.

2. Melhorar a robustez contra erros de schema/modelo
- Se a IA devolver resposta sem tool call ou JSON inválido, salvar um resultado fallback estruturado em vez de deixar tudo vazio.
- Se o gateway devolver 400 por schema, registrar erro técnico nos logs, mas manter mensagem amigável ao cliente.
- Para análises que falham no AI Gateway, gravar pelo menos um resultado mínimo com `manual_review_required = true`, preservando o arquivo e metadados.

3. Ajustar o modelo para melhor leitura dos extratos reais
- Trocar o modelo barato atual (`google/gemini-2.5-flash-lite`) para o padrão recomendado `google/gemini-3-flash-preview`, que é mais adequado para extração estruturada e menos frágil nestes documentos.
- Manter limite de texto compacto para controlar custo e payload.

4. Validar com os PDFs anexados
- Reprocessar o fluxo usando os mesmos tipos de documentos:
  - CaixaBank com 59 páginas e período 01/01/2025–27/04/2026.
  - ING com 10 páginas e período 01/10/2025–31/12/2025.
- Confirmar que o registro no banco sai de `ERROR` para `FINISHED` em novos uploads.
- Confirmar que o painel admin passa a mostrar titular, banco, IBAN, período, ingresos, ahorros, créditos/deudas e detalhes por titular.

5. Melhorar o painel admin para casos de erro
- Na tabela de Verificación de Extractos, quando uma análise estiver em `ERROR`, mostrar também:
  - nome do arquivo;
  - páginas;
  - data;
  - mensagem técnica resumida para admin, sem expor dados bancários sensíveis.
- Isso evita que futuros erros pareçam “vazios” no painel.

Arquivos a alterar

- `supabase/functions/_shared/internalStatementAnalysis.ts`
- `supabase/functions/bewor-public-upload/index.ts`
- `src/pages/admin/VerificacionesExtractos.tsx`

Validação técnica após implementar

- Rodar `deno check` nas Edge Functions afetadas.
- Fazer build frontend.
- Consultar logs da Edge Function `bewor-public-upload` para confirmar que o erro `property is not defined` desapareceu.
- Consultar as últimas linhas de `lead_document_analysis` para verificar novos resultados com `status = FINISHED` e dados preenchidos.

Observação importante

Os registros já criados em `ERROR` não têm resultado financeiro porque a IA nunca chegou a processar os PDFs. Depois da correção, o caminho mais seguro é subir novamente os mesmos PDFs por um link novo. Se quiser, também posso incluir um botão admin de “Reprocesar” para reaproveitar o PDF já guardado no Storage sem pedir novo upload.