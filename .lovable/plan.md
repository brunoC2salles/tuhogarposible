Diagnóstico

O erro não vem do PDF nem do botão de upload em si. O arquivo está sendo recebido pela Edge Function, o texto é extraído, mas a chamada ao Lovable AI está retornando HTTP 400 (`AI_GATEWAY_400`).

A causa mais provável está no payload enviado ao AI Gateway em `internalStatementAnalysis.ts`: o schema de tool calling usa tipos como `type: ["string", "null"]`. Esse formato pode ser rejeitado pelo gateway/modelo, gerando 400 antes mesmo da análise começar. Como a função hoje só mostra `AI_GATEWAY_400`, o usuário final vê uma mensagem técnica e pouco útil.

Plano de correção

1. Corrigir o schema estruturado enviado ao Lovable AI
- Trocar os campos nullable (`holder_name`, `bank_name`, `iban_masked`, `period_start`, `period_end`) para um formato aceito pelo gateway.
- Melhor opção: usar `type: "string"` e instruir que, quando não houver valor, retorne string vazia.
- Ajustar a normalização pós-resposta para converter strings vazias em `null` quando salvar no banco.
- Manter o modelo barato atual, sem aumentar custo neste momento.

2. Tornar a análise mais resiliente
- Reduzir um pouco o limite de texto enviado por PDF para diminuir risco de payload muito grande em extratos longos.
- Manter a estratégia atual de compactação inteligente: início, fim e amostras mensais.
- Se a IA não devolver tool call válido, salvar resultado fallback com revisão manual em vez de quebrar o fluxo sempre que possível.

3. Melhorar mensagem de erro ao cliente
- No backend, quando houver erro 400 do AI Gateway, salvar a análise como `ERROR` com uma mensagem interna clara.
- No frontend público, trocar `Error: AI_GATEWAY_400` por uma mensagem amigável, por exemplo:
  - “No se pudo analizar automáticamente el extracto. Nuestro equipo revisará el documento manualmente.”
- Evitar expor códigos técnicos ao lead.

4. Adicionar logging seguro para diagnosticar sem expor dados sensíveis
- No erro do AI Gateway, registrar apenas status e um resumo curto da resposta do gateway.
- Não registrar o texto completo do extrato nem dados bancários sensíveis.

5. Validar com os casos reais
- Rodar `deno check` na Edge Function afetada.
- Testar novamente o upload com o PDF CaixaBank da imagem e com os exemplos ING/CaixaBank já usados.
- Confirmar que:
  - upload aceita até 3 PDFs;
  - a análise finaliza sem `AI_GATEWAY_400`;
  - o resultado público mostra apenas aprovação e hipoteca máxima;
  - a página admin mantém IBAN, titular, ingresos, créditos, ahorros e detalhes por titular.

Arquivos que serão alterados

- `supabase/functions/_shared/internalStatementAnalysis.ts`
- `supabase/functions/bewor-public-upload/index.ts`
- `src/pages/PublicDocumentUpload.tsx`

Observação

Não vou mexer na base de dados nem em regras do CRM para esta correção. A mudança é focada em estabilizar o leitor interno e melhorar o tratamento do erro.