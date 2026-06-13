## Problema

O lead apareceu no Make mas o módulo HTTP falhou com:
> Bad control character in string literal in JSON at position 494

Causa: o valor de `hora_reunion` vem do Meta com um `\n` no final (`"15/06 12:00\n"`), e o mapping atual com `ifempty(...)` **não aplica** o `replace(... newline ...)` que os outros campos têm. Isso quebra o JSON antes mesmo de sair do Make.

Em paralelo, o formato novo do Meta é `DD/MM HH:mm` (sem ano), e o `parseFechaReunion` do webhook só aceita `DD/MM/YYYY`. Mesmo que o JSON chegasse, `lead_fecha_reunion_bitrix` ficaria vazio.

## Ajustes

### 1. No Make (você aplica — não é código)

Trocar o mapping de `hora_reunion` por uma versão que limpa control chars **por fora** do `ifempty`:

```
"hora_reunion": "{{replace(replace(replace(ifempty(1.data.`indica_día_(dd/mm)_y_hora_(ej._18/00...)`; 1.data.`¿cuándo_te_gustaría_que_te_llamásemos?`); newline; ""); tab; ""); `"`; `\"`)}}"
```

Isso resolve o `InvalidConfigurationError` imediatamente.

### 2. No código (eu aplico)

Em `supabase/functions/meta-lead-webhook/index.ts`, ampliar `parseFechaReunion` para aceitar `DD/MM` sem ano:

- Adicionar regex `\b(\d{1,2})[\/\-.](\d{1,2})\b` (com lookahead negativo para não colidir com `DD/MM/YYYY`).
- Assumir o ano atual; se a data já passou, usar o próximo ano (lead agendando para o futuro).
- Resultado: `"15/06 12:00"` → `fecha_reunion = 2026-06-15`, `hora_reunion = 12:00:00`, `lead_fecha_reunion_bitrix = 2026-06-15T12:00:00`.

Sem alterações em outros arquivos. Em seguida, faço deploy de `meta-lead-webhook`.

### 3. Validação

Após você salvar o Make e eu fazer o deploy:
- Replay do lead no Make → verificar que o body chega sem erro de JSON.
- Conferir nos logs do `meta-lead-webhook` que `lead_fecha_reunion_bitrix` aparece preenchido.
- Conferir no Bitrix que `UF_CRM_1779577250982` recebeu o valor.
