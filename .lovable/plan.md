Vou gerar uma tabela CSV baixável com todos os leads aprovados dos últimos 2 dias, no formato solicitado.

Escopo do arquivo:
- Filtrar leads criados nos últimos 2 dias.
- Considerar como “aprovados” os leads que não estão em `descualificados` e/ou têm `simulador_hipotecario_data.aprobado = true`.
- Exportar as colunas exatamente nesta ordem:

```text
email,email,email,phone,phone,phone,madid,fn,ln,zip,ct,st,country,dob,doby,gen,age,uid,value
```

Preenchimento previsto:
- `email`, `email`, `email`: mesmo email repetido 3 vezes.
- `phone`, `phone`, `phone`: mesmo telefone repetido 3 vezes.
- `madid`: vazio, porque não temos esse identificador.
- `fn`: primeiro nome.
- `ln`: restante do nome/sobrenome.
- `zip`: vazio, porque não temos código postal.
- `ct`: cidade de interesse, quando existir.
- `st`: região/zona de interesse, quando existir.
- `country`: `ES` para Espanha.
- `dob`: vazio, salvo se houver data de nascimento disponível no JSON do lead.
- `doby`: ano de nascimento, se existir no JSON.
- `gen`: vazio, porque não temos gênero.
- `age`: idade, se existir no JSON.
- `uid`: ID interno do lead.
- `value`: valor do imóvel desejado ou valor máximo/preço máximo aprovado da simulação hipotecária, quando existir.

Após aprovação, vou:
1. Consultar a base Supabase.
2. Transformar os dados para esse layout.
3. Gerar o arquivo em `/mnt/documents/`, por exemplo `leads_hipoteca_aprobada_ultimos_2_dias.csv`.
4. Entregar o link de download do CSV.