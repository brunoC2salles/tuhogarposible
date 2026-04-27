Plano de implementação

1. Limpar a página de Verificación de Extractos
- Trocar textos e colunas que ainda dizem “Bewor” para linguagem neutra do leitor interno.
- Atualizar os badges de estado para usar os campos internos: FINISHED, ERROR, PROCESSING, revisión manual, 12 meses incompletos e aprobado/no aprobado.
- Remover a coluna “Records” e qualquer lógica de contagem específica da API antiga.
- Renomear “Ingresos Bewor” para “Ingresos mensuales”.

2. Criar link automático para leads fora do CRM e testes
- Na própria página `/admin/verificaciones-extractos`, adicionar um card “Crear enlace de verificación”.
- O botão criará um token standalone com `lead_id = null`, usando a estrutura já existente em `lead_document_tokens`.
- Mostrar o link gerado (`/documentos/{token}`), botão para copiar e lista de links standalone ativos.
- Esses uploads continuarão entrando como análises sem lead vinculado, permitindo testes e envio a pessoas que ainda não estão no CRM.

3. Melhorar o modal “ver mais” da verificação
- Ao clicar no olho, mostrar um resumo completo e claro:
  - Nome/titular
  - Banco
  - IBAN
  - DNI/NIE quando houver
  - Número de titulares
  - Meses detectados e meses faltantes
  - Ingresos mensuales
  - Créditos/deudas mensuales
  - Ahorros
  - Cuota máxima
  - Hipoteca máxima
  - Resultado aprovado/não aprovado
  - Confiança e avisos da IA
- Para 2 titulares, mostrar cada titular separadamente e também os totais somados.
- Manter edição manual apenas do que já existe hoje: DNI/NIE e ingresos mensuales, sem criar complexidade adicional.

4. Base de dados: remover dependência Bewor sem quebrar histórico
- Criar migração para mudar o default de `lead_document_analysis.analysis_provider` de `'bewor'` para `'internal'`.
- Adicionar uma função de token com nome neutro, por exemplo `generate_document_token()`, e alterar o trigger de lead qualificado para usar esse novo nome.
- Manter temporariamente campos/rotas antigas que ainda são usadas pelo frontend (`bewor-public-upload`, `bewor-public-status`, `bewor-get-token-info`) para não quebrar links existentes; remover apenas referências e lógica externa da Bewor que já não devem aparecer ou ser usadas.
- Não apagar dados históricos de análises antigas por segurança; apenas deixar a operação nova 100% interna.

5. Remover partes Bewor visíveis e obsoletas
- Remover da página de configurações o card “Generar JWT Third-Party Bewor”.
- Remover estados/imports relacionados a gerar JWT Bewor nessa página.
- Revisar textos do CRM relacionados a “Avisos del análisis Bewor” para linguagem neutra quando aplicável.

6. Ajustar Edge Functions públicas para fluxo interno
- Em `bewor-public-status`, remover o fallback que busca resultado direto na Bewor.
- Remover imports de `beworExtraction` desse status público, deixando o endpoint apenas consultar a análise interna salva no banco.
- Manter o nome técnico das funções por compatibilidade com links e frontend, mas sem chamada externa Bewor.

7. Validação
- Rodar typecheck/build do frontend.
- Rodar `deno check` nas Edge Functions afetadas.
- Confirmar que:
  - a página de verificações não mostra Bewor;
  - link standalone é gerado e copiado;
  - análises standalone aparecem como “sin lead vinculado”;
  - modal mostra IBAN, nome, ahorros, créditos, ingresos mensuales e detalhes por titular;
  - fluxo normal de lead qualificado continua gerando link automático.