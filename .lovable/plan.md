Plano de ajuste:

1. Corrigir a raiz do erro no Make
- O erro da imagem acontece porque a linha de `hora_reunion` está inválida no JSON:
  - aparece como `hora_reunion":"17/06 a las 15:00}`
  - falta aspas antes da chave (`"hora_reunion"`)
  - falta aspas de fechamento do valor (`"17/06 a las 15:00"`)
- A forma correta no corpo HTTP do Make deve ser:
```json
"hora_reunion": "{{replace(replace(replace(ifempty(1.data.`indica_día_(dd/mm)_y_hora_(ej._18/00...)`; 1.data.`¿cuándo_te_gustaría_que_te_llamásemos?`); newline; ""); tab; ""); `"`; `\"`)}}",
"zona_horaria_reunion": "Europe/Madrid"
```

2. Blindar o webhook no backend contra JSON quase-válido
- Ajustar o parser de `meta-lead-webhook` para ler o body como texto primeiro.
- Se o JSON normal falhar, aplicar uma correção mais robusta para:
  - remover caracteres de controle reais dentro dos valores;
  - corrigir especificamente `hora_reunion\":` para `"hora_reunion":` quando vier escapado indevidamente;
  - corrigir valor de `hora_reunion` sem aspas de fechamento antes de `}` ou `,`.
- Só retornar erro 400 se ainda assim o body não puder ser recuperado.

3. Garantir parsing do horário recebido
- Manter suporte ao formato `DD/MM HH:mm` e validar também textos como `17/06 a las 15:00`.
- Confirmar que `fecha_reunion`, `hora_reunion`, `hora_reunion_texto`, `reunion_datetime` e `lead_fecha_reunion_bitrix` sejam preenchidos.

4. Deploy e validação
- Fazer deploy da edge function `meta-lead-webhook`.
- Validar com um payload igual ao da imagem, confirmando que ele cria o lead e monta o payload Bitrix com a data/hora.