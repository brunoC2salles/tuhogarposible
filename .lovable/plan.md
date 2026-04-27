# Plano revisado: leitor próprio de extratos bancários

## Decisões confirmadas

1. O extrato será sempre em PDF.
2. O upload será limitado a no máximo 3 documentos por análise.
3. Se os PDFs não cobrirem 12 meses, o lead verá uma mensagem clara dizendo que o extrato não contém os 12 meses necessários.
4. No resultado público do lead, mostrar apenas:
   - aprovação/reprovação;
   - hipoteca máxima.
5. Usaremos IA estruturada pela opção mais barata disponível no Lovable AI.

---

## Objetivo

Substituir a dependência da Bewor por um leitor próprio de extratos bancários, mantendo o fluxo já existente de link público, upload seguro, CRM e resultado para o lead.

O lead qualificado deverá ter automaticamente um link gerado. Esse link será enviado posteriormente ao Bitrix/Make e poderá ser enviado pelo agente para o cliente subir os PDFs dos extratos bancários dos últimos 12 meses.

Após o upload, o sistema deverá:

- ler os PDFs;
- identificar se cobrem 12 meses;
- extrair ingresos recorrentes;
- extrair créditos/deudas mensais;
- extrair ahorros pelo saldo;
- suportar 1 ou 2 titulares;
- somar ingresos, créditos e ahorros quando houver 2 titulares;
- calcular aprovação e hipoteca máxima;
- mostrar resultado simples ao lead;
- mostrar resultado detalhado no CRM.

---

## Estratégia geral

Não vamos reconstruir tudo do zero. Vamos aproveitar o fluxo já existente da análise Bewor, porque ele já tem as bases certas:

- tokens públicos seguros;
- página `/documentos/:token`;
- upload para Storage privado;
- tabela `lead_document_analysis`;
- atualização em tempo real no CRM;
- aba de análise no card do lead;
- geração automática de link quando o lead chega a `lead_cualificado`.

A mudança será transformar esse fluxo em um sistema interno de leitura de extratos, mantendo compatibilidade com o histórico da Bewor.

---

## Fluxo final

```text
Lead qualificado
  ↓
Sistema gera link seguro automaticamente
  ↓
Link fica disponível no CRM e no payload Bitrix/Make
  ↓
Agente envia link ao cliente
  ↓
Cliente abre /documentos/:token
  ↓
Cliente seleciona 1 ou 2 titulares
  ↓
Cliente sobe até 3 PDFs no total
  ↓
Sistema processa PDFs em Edge Function
  ↓
Lovable AI extrai dados estruturados
  ↓
Sistema valida se há 12 meses
  ↓
Sistema soma dados dos titulares
  ↓
Sistema calcula hipoteca máxima
  ↓
Lead vê resultado simples
  ↓
CRM recebe análise detalhada
```

---

## Upload público

Atualizar a página pública de documentos para pedir claramente:

> Sube tus extractos bancarios de los últimos 12 meses en PDF.

Regras da tela:

- aceitar apenas PDF;
- máximo 3 PDFs por análise;
- limite de tamanho por arquivo a definir mantendo controle de performance;
- opção de 1 titular ou 2 titulares;
- cada PDF poderá ser marcado como:
  - titular 1;
  - titular 2;
  - ambos, caso o extrato seja de conta conjunta;
- mostrar progresso simples:
  - documento recebido;
  - analisando extratos;
  - calculando resultado;
  - resultado final.

### Se não houver 12 meses

Se o leitor detectar menos de 12 meses cobertos, o resultado público não mostrará hipoteca máxima como se fosse válido.

Mensagem pública sugerida:

> El extracto enviado no contiene los últimos 12 meses completos. Por favor, sube un documento que cubra los últimos 12 meses para poder calcular tu hipoteca máxima.

No CRM, o agente verá quantos meses foram detectados e quais meses parecem faltar.

---

## Resultado público do lead

O lead verá apenas informações simples.

### Caso aprovado

- Estado: aprovado/viável.
- Hipoteca máxima estimada.

Exemplo:

> Tu análisis ha sido aprobado. Hipoteca máxima estimada: 180.000€.

### Caso não aprovado

- Estado: não aprovado.
- Sem detalhar internamente todos os motivos financeiros.

Exemplo:

> Tu análisis no ha sido aprobado automáticamente. Tu agente revisará tu caso y te contactará.

### Caso incompleto

- Mensagem de falta de 12 meses.

Exemplo:

> El extracto enviado no contiene los últimos 12 meses completos. Por favor, sube documentación completa.

---

## Resultado no CRM

No CRM, o agente/admin verá a análise completa:

- status da análise;
- titular(es);
- banco(s);
- IBAN mascarado;
- meses detectados;
- meses faltantes;
- ingresos mensais recorrentes;
- ingresos médios;
- créditos/deudas recorrentes;
- ahorros detectados pelo saldo;
- confiança da extração;
- alertas;
- hipoteca máxima;
- aprovação/desqualificação;
- botão para baixar PDFs;
- botão para aplicar dados ao simulador do lead;
- campos manuais para correção em caso de baixa confiança.

A interface deixará de dizer “Bewor OCR” nos novos fluxos e passará a dizer “Análisis de extractos”.

---

## IA estruturada de baixo custo

Usaremos Lovable AI via Edge Function, nunca diretamente no frontend.

Modelo recomendado para a primeira versão:

- `google/gemini-2.5-flash-lite`, por ser a opção mais barata/rápida para extração estruturada simples.

Estratégia de custo:

1. Extrair texto dos PDFs primeiro.
2. Enviar apenas o texto necessário para a IA, não o arquivo inteiro quando não for necessário.
3. Pedir saída estruturada usando tool calling/schema, não resposta livre em texto.
4. Processar no máximo 3 PDFs.
5. Guardar somente o JSON final e resumo financeiro, não o texto integral dos extratos.
6. Se a IA retornar baixa confiança ou dados incompletos, marcar para revisão/manual ou pedir novo documento, em vez de fazer várias chamadas caras automaticamente.

Importante: erros de limite ou créditos do Lovable AI serão tratados claramente:

- 429: informar que o serviço está temporariamente limitado e tentar novamente depois;
- 402: informar que é necessário adicionar créditos ao workspace.

---

## Extração dos PDFs

Criar uma Edge Function interna para análise, por exemplo:

- `bank-statement-upload` ou adaptação segura da função atual de upload;
- `bank-statement-analyze` para processar e calcular.

A análise fará:

1. validar token;
2. salvar PDFs no bucket privado `lead-documents`;
3. criar/atualizar registro em `lead_document_analysis`;
4. extrair texto dos PDFs;
5. enviar texto ao Lovable AI com schema fixo;
6. receber JSON estruturado;
7. validar dados;
8. calcular resultado financeiro;
9. gravar resultado final;
10. liberar resultado ao lead e ao CRM.

---

## Estrutura de dados recomendada

Aproveitar a tabela `lead_document_analysis` e adicionar apenas campos necessários.

Campos novos sugeridos:

- `analysis_provider`: `internal` ou `bewor`;
- `num_titulares`: 1 ou 2;
- `analysis_input`: JSON com arquivos e titular correspondente;
- `extracted_financials`: JSON financeiro normalizado;
- `confidence_score`: confiança geral;
- `manual_review_required`: boolean;
- `months_detected`: número de meses detectados;
- `missing_months`: JSON/lista dos meses ausentes.

Exemplo do JSON final:

```json
{
  "titulares": [
    {
      "index": 1,
      "holder_name": "...",
      "bank_name": "...",
      "iban_masked": "ES12 **** **** 1234",
      "period_start": "2025-04-01",
      "period_end": "2026-03-31",
      "months_detected": 12,
      "monthly_recurring_income": 1800,
      "average_monthly_income": 1900,
      "monthly_debts": 250,
      "savings_balance": 9000,
      "confidence": 0.85,
      "warnings": []
    }
  ],
  "combined": {
    "months_detected": 12,
    "monthly_recurring_income": 3600,
    "monthly_debts": 400,
    "savings_balance": 17000
  }
}
```

---

## Regras de leitura financeira

### Ingresos

Identificar ingresos recorrentes mensais, dando prioridade a:

- nómina;
- pensión;
- prestação recorrente;
- transferências recorrentes claramente salariais;
- ingresos consistentes de autónomo, quando apareçam de forma recorrente.

Ignorar como ingreso recorrente:

- Bizum pontual;
- transferências familiares pontuais;
- devoluções;
- reembolsos;
- venda pontual;
- entradas sem recorrência clara.

### Créditos/deudas

Identificar pagamentos recorrentes de:

- préstamo;
- crédito;
- financiación;
- hipoteca existente;
- cuotas mensais de dívida.

Somar a cuota mensal recorrente.

### Ahorros

Usar saldo:

1. saldo final mais recente, quando disponível;
2. se não houver saldo final confiável, usar melhor saldo detectado com baixa confiança;
3. se não houver saldo, marcar revisão/manual.

### Dois titulares

Para 2 titulares:

- somar ingresos recorrentes;
- somar créditos/deudas;
- somar ahorros;
- manter análise individual no CRM.

---

## Cálculo de aprovação e hipoteca máxima

Criar uma versão compartilhada no backend da lógica hipotecária necessária, alinhada ao simulador atual.

Regras principais:

- DTI: 35%;
- taxa hipotecária: 2,5%;
- prazo máximo: 30 anos;
- cap de hipoteca:
  - 1 titular: 180.000€;
  - 2 titulares: 210.000€;
- créditos/deudas reduzem a capacidade mensal;
- ahorros entram no cálculo de capacidade/recomendação quando aplicável;
- sem 12 meses completos, não aprovar automaticamente.

Resultado salvo em `viabilidade_sugerida`:

```json
{
  "aprobable": true,
  "hipoteca_maxima": 180000,
  "cuota_max": 620,
  "ingresos_detectados": 2400,
  "deudas_detectadas": 180,
  "ahorros_detectados": 12000,
  "razon": "Capacidad estimada...",
  "months_detected": 12,
  "manual_review_required": false
}
```

---

## Bitrix / Make

Atualizar o payload único usado no Bitrix/Make para incluir o link de documentos.

Manter compatibilidade com o campo antigo:

- `bewor_link_documentos`: continuará existindo temporariamente, apontando para o novo link;

Adicionar campos neutros:

- `documentos_link`;
- `bank_statement_upload_link`.

Assim não quebramos o cenário atual do Make e podemos migrar os nomes depois com calma.

---

## Compatibilidade com Bewor

Não remover Bewor nesta primeira implementação.

Motivo: reduzir risco e preservar histórico.

O plano é:

- análises antigas Bewor continuam visíveis;
- novas análises usam `analysis_provider = 'internal'`;
- funções Bewor podem ficar no projeto sem serem chamadas pelo novo fluxo;
- após validar o leitor próprio com extratos reais, fazemos uma limpeza separada.

---

## Uso dos extratos reais que você tem

Depois que você enviar os PDFs de exemplo, eles serão usados para calibrar:

- prompt da IA;
- schema de extração;
- identificação de meses;
- nomes comuns de nómina/ingresos;
- padrões de créditos;
- leitura de saldo;
- mensagens de erro.

A ideia é começar com poucos bancos reais e ir aumentando robustez sem deixar a plataforma lenta.

---

## Implementação em etapas

### Etapa 1 — Base segura

- Adicionar campos mínimos à tabela `lead_document_analysis`.
- Criar tipos internos para análise de extratos.
- Trocar textos de “Bewor” para “Análisis de extractos” nos novos fluxos.
- Atualizar mensagens para 12 meses.
- Manter histórico antigo intacto.

### Etapa 2 — Upload público novo

- Atualizar `/documentos/:token`.
- Permitir 1 ou 2 titulares.
- Permitir até 3 PDFs.
- Salvar metadados de titular por arquivo.
- Mostrar progresso simples.

### Etapa 3 — Edge Function de análise

- Criar processamento interno com Lovable AI.
- Usar modelo barato `google/gemini-2.5-flash-lite`.
- Usar schema estruturado/tool calling.
- Tratar erros 429/402.
- Gravar dados normalizados.

### Etapa 4 — Validação dos 12 meses

- Detectar período coberto.
- Se não houver 12 meses, marcar análise como incompleta.
- Mostrar mensagem pública pedindo extrato completo.
- Mostrar detalhes no CRM.

### Etapa 5 — Cálculo hipotecário

- Somar dados para 2 titulares.
- Calcular hipoteca máxima.
- Gravar `viabilidade_sugerida`.
- Preparar resultado público simplificado.

### Etapa 6 — CRM

- Atualizar aba de análise.
- Mostrar dados detalhados extraídos.
- Permitir download dos PDFs.
- Permitir correção manual quando necessário.
- Permitir aplicar dados ao simulador.

### Etapa 7 — Bitrix/Make

- Incluir novo link no payload.
- Manter alias `bewor_link_documentos`.
- Adicionar `documentos_link` e `bank_statement_upload_link`.

### Etapa 8 — Teste com PDFs reais

- Testar com os extratos atuais de clientes.
- Ajustar schema/prompt.
- Confirmar leitura de 12 meses, ingresos, créditos e saldo.
- Validar resultado no CRM e no link público.

---

## O que não será mexido agora

- Não alterar Kanban/CRM workflow.
- Não remover Bewor completamente.
- Não recriar o simulador do zero.
- Não salvar textos completos dos extratos no banco.
- Não processar PDFs pesados no navegador.
- Não expor detalhes financeiros completos na tela pública do lead.
- Não reintroduzir funcionalidades decommissionadas.

---

## Resultado esperado

Ao final, teremos um leitor próprio, mais controlável e barato, integrado ao fluxo atual, com:

- link automático por lead qualificado;
- upload público simples;
- análise por IA estruturada barata;
- validação obrigatória de 12 meses;
- suporte a 1 ou 2 titulares;
- resultado simples para o lead;
- resultado completo no CRM;
- compatibilidade com Bitrix/Make;
- preservação do histórico da Bewor.