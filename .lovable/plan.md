Vou corrigir a lógica para que respostas afirmativas em `tiene_ahorros_impuestos` qualifiquem o lead, mesmo sem valor numérico, e para que o campo enviado ao Bitrix seja normalizado como `sí`.

Plano de implementação:

1. Normalizar respostas afirmativas de ahorros
   - Criar/ajustar uma função de normalização para reconhecer `si`, `sí`, `yes` e derivados.
   - Incluir variações comuns como maiúsculas/minúsculas, acentos, espaços e textos derivados do tipo `sí tengo`, `si tengo ahorros`, `yes I have`, `yes tengo`, etc.
   - Evitar falsos positivos óbvios como `no`, `no tengo`, `sin ahorros`.

2. Corrigir a qualificação no webhook Meta Ads
   - Em `supabase/functions/meta-lead-webhook/index.ts`, manter o lead como qualificado se:
     - respondeu afirmativamente sobre ahorros; ou
     - declarou `monto_ahorros >= 5000`.
   - Isso preserva a regra que você pediu: quem responde `si`, `sí`, `yes` e derivados deve ser qualificado.

3. Normalizar o valor salvo para reenvio
   - Quando a resposta for afirmativa, salvar `meta_tiene_ahorros` como `sí` dentro de `simulador_hipotecario_data`.
   - Assim, qualquer reenvio/manual proxy que usa os dados salvos também mantém o valor padronizado.

4. Corrigir o payload enviado ao Bitrix
   - Em `supabase/functions/_shared/bitrixPayload.ts`, garantir que `meta_tiene_ahorros` saia como `sí` quando a resposta original for afirmativa.
   - Se houver valor numérico suficiente mas não houver resposta textual afirmativa, manter o texto original ou vazio, sem inventar resposta.
   - O campo `meta_monto_ahorros` continuará enviando o número parseado normalmente.

5. Atualizar memória/regra do projeto
   - Atualizar a documentação de memória da regra Meta Ads para refletir que derivados afirmativos também qualificam e que o payload Bitrix deve enviar `meta_tiene_ahorros: "sí"` para respostas afirmativas.

6. Verificação
   - Validar mentalmente os principais casos:

```text
"si"               -> qualificado, Bitrix meta_tiene_ahorros = "sí"
"sí"               -> qualificado, Bitrix meta_tiene_ahorros = "sí"
"yes"              -> qualificado, Bitrix meta_tiene_ahorros = "sí"
"sí tengo"         -> qualificado, Bitrix meta_tiene_ahorros = "sí"
"yes tengo ahorros"-> qualificado, Bitrix meta_tiene_ahorros = "sí"
"no"               -> não qualifica por resposta afirmativa
"no tengo"         -> não qualifica por resposta afirmativa
monto_ahorros 5000 -> qualifica por valor mínimo
```

Arquivos a alterar:
- `supabase/functions/meta-lead-webhook/index.ts`
- `supabase/functions/_shared/bitrixPayload.ts`
- `.lovable/memory/features/meta-ads-qualification-rules-2025.md`

Depois de aprovado, implemento a correção diretamente.