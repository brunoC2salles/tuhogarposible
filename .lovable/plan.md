Sim, é possível. Vou gerar uma tabela CSV baixável com os leads dos últimos 2 meses usando os critérios que confirmou:

Critérios do filtro:
- `created_at >= últimos 2 meses`
- `simulador_hipotecario_data.aprobado = true`
- E ahorros válidos:
  - `meta_monto_ahorros >= 5000`, ou
  - `meta_tiene_ahorros` igual a `si`, `sí`, `yes`, `true` ou `1`

Pela consulta de validação, isto retorna 38 leads.

Formato do CSV:
```text
email,email,email,phone,phone,phone,madid,fn,ln,zip,ct,st,country,dob,doby,gen,age,uid,value
```

Como vou preencher:
- `email`, `email`, `email`: mesmo email repetido 3 vezes
- `phone`, `phone`, `phone`: mesmo telefone repetido 3 vezes
- `fn`: primeiro nome extraído de `nombre_completo`
- `ln`: restante do nome como sobrenome
- `country`: `ES`
- `uid`: ID interno do lead
- `value`: valor de ahorros detectado, quando existir
- Campos sem dados confiáveis (`madid`, `zip`, `ct`, `st`, `dob`, `doby`, `gen`, `age`) ficarão vazios, exceto `age` se conseguir extrair das notas com padrão `Edad: X`

Após aprovação, vou gerar o arquivo em `/mnt/documents/` e entregar o link de download como artefato CSV.