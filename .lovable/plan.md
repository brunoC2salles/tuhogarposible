Respirei fundo e fui direto aos dados. Você tem razão em se preocupar: o CSV que eu gerei usou um critério errado/amplo demais para “aprovado”.

Diagnóstico confirmado:

```text
Últimas 48h no banco:
- 121 leads criados
- 13 estão visíveis/ativos no CRM como stage != descualificados
- 108 estão em descualificados
- 92 têm simulador_hipotecario_data.aprobado = true

Distribuição:
- nuevo_lead + hipoteca_aprobada=true: 13
- descualificados + hipoteca_aprobada=true: 79
- descualificados + hipoteca_aprobada=false: 29
```

O problema foi a interpretação do campo `simulador_hipotecario_data.aprobado`.

Esse campo indica que, pela simulação financeira/hipotecária, a pessoa teria capacidade numérica para uma hipoteca. Mas isso NÃO significa que o lead foi qualificado para o CRM/Bitrix.

A qualificação real do webhook é outra: se o lead falha em critérios como antiguidade laboral, morosidade, idade, DNI/NIE, rendimento, dívida ou ahorros, ele é gravado como `stage = descualificados` e não deveria entrar na lista de “qualificados”.

No arquivo de 38 leads que você está vendo agora, conferi os IDs do próprio CSV:

```text
Arquivo: leads_hipoteca_aprobada_ahorros_ultimos_2_meses.csv
Total no CSV: 38
- 15 estão em nuevo_lead
- 23 estão em descualificados
```

Ou seja: 23 dos 38 não deveriam estar nessa lista de leads qualificados. Eles entraram porque eu filtrei por `hipoteca_aprobada=true`, e isso incluiu descualificados que tinham simulação positiva mas foram reprovados por outros critérios.

Razões extraídas desses 23 descualificados do CSV:

```text
- 18: Antigüedad laboral insuficiente (menos de 1 año)
- 3: Está en fichero de morosidad
- 2: Edad superior a 54 años
```

Conclusão objetiva:

O CRM está certo. O erro está no CSV/exportação que eu gerei, porque tratei “simulação hipotecária aprovada” como “lead qualificado”. São conceitos diferentes.

Plano de correção:

1. Regenerar imediatamente o CSV correto usando como critério principal:
   ```sql
   stage <> 'descualificados'
   ```
   Ou seja, somente leads que realmente permanecem ativos/qualificados no CRM.

2. Para os últimos 2 dias, o arquivo correto deve ter aproximadamente os mesmos 13 leads ativos encontrados no banco agora, podendo bater com os 11 do CRM dependendo de:
   - janela exata de “últimos 2 dias” versus dias calendário;
   - filtro visual atual do CRM;
   - leads criados depois da sua contagem.

3. Gerar também um arquivo de auditoria separado, se você quiser, com os leads que foram indevidamente incluídos no CSV anterior:
   - ID
   - nome
   - email
   - telefone
   - stage
   - motivo de descualificação
   - `simulador_hipotecario_data.aprobado`

4. A partir de agora, para exports de “qualificados”, usar sempre a regra:
   ```text
   qualificado = stage != descualificados
   ```
   e nunca apenas `simulador_hipotecario_data.aprobado = true`.

5. Opcionalmente, ajustar o nome dos próximos arquivos para evitar ambiguidade:
   - `leads_crm_qualificados_ultimos_2_dias.csv`
   - em vez de `leads_hipoteca_aprobada...`, porque “hipoteca aprovada” pode confundir simulação com qualificação real.

Se você aprovar, eu gero agora o CSV corrigido e, se quiser, também o CSV de auditoria com os 23 que foram incluídos indevidamente.