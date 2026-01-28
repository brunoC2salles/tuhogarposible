
# ✅ Implementação Concluída: Novas Perguntas Meta Ads

## Alterações Realizadas

### 1. `supabase/functions/meta-lead-webhook/index.ts`
- ✅ Interface `MetaLeadData` atualizada com 3 novos campos
- ✅ Sanitização dos novos campos adicionada
- ✅ Notas do lead incluem os novos campos
- ✅ Payload para Bitrix inclui os novos campos

### 2. `supabase/functions/make-webhook-proxy/index.ts`
- ✅ Action `test_meta_bitrix_last_lead` extrai os novos campos das notas
- ✅ Action `send_lead_assignment` inclui os novos campos no payload

---

## Código JSON para Make.com

Cole este código no módulo HTTP do Make.com que envia dados para o `meta-lead-webhook`:

```json
{
  "nombre": "{{replace(replace(replace(1.data.full_name; newline; ); tab; ); emptystring; \"\")}}",
  "telefono": "{{replace(replace(1.data.phone_number; newline; \"\"); tab; \"\")}}",
  "email": "{{replace(replace(1.data.email; newline; \"\"); tab; \"\")}}",
  "antiguedad_trabajo": "{{replace(replace(1.data.`¿cuál_es_tu_antigüedad_en_tu_trabajo_actual?`[]; newline; ); tab; )}}",
  "tiene_nie_dni": "{{replace(replace(1.data.`¿tienes_nie_o_dni?`[]; newline; ); tab; )}}",
  "en_fichero_morosidad": "{{replace(replace(1.data.`¿te_encuentras_en_algún_fichero_de_morosidad?`[]; newline; ); tab; )}}",
  "preferencia_llamada": "{{replace(replace(1.data.`¿cuándo_prefieres_que_te_llamemos?`[]; newline; ); tab; )}}",
  "zona_interes": "{{replace(replace(1.data.`¿en_qué_zona_quieres_vivir?`; newline; ); tab; )}}",
  "rango_ingresos": "{{replace(replace(1.data.`para_poder_ayudarte_y_conocer_tu_viabilidad,_indica_el_rango_aproximado_de_ingresos_netos_mensuales_del_hogar.`; newline; ); tab; )}}",
  "deudas_mensuales": "{{replace(replace(1.data.`en_caso_de_tener_algún_crédito_o_deuda_¿cuánto_pagas_mensualmente?`; newline; \"\"); tab; \"\")}}",
  "habitaciones": "{{replace(replace(1.data.`¿número_de_habitaciones?`; newline; \"\"); tab; \"\")}}",
  "tiene_ahorros_impuestos": "{{replace(replace(1.data.`¿cuentas_con_ahorros_disponibles_para_impuestos_sobre_la_compra?`[]; newline; ); tab; )}}",
  "monto_ahorros": "{{replace(replace(1.data.`¿cuánto?`; newline; \"\"); tab; \"\")}}",
  "tiene_vivienda_seleccionada": "{{replace(replace(1.data.`¿cuentas_con_la_vivienda_de_tu_interés_seleccionada?`[]; newline; ); tab; )}}"
}
```

**⚠️ IMPORTANTE:** Verifique no Make.com os nomes exatos dos campos das novas perguntas do Facebook e ajuste conforme necessário.

---

## Campos Enviados ao Bitrix24

Os seguintes campos são enviados via webhook:

| Campo | Descrição |
|-------|-----------|
| `meta_tiene_ahorros` | Resposta: "Cuentas con ahorros disponibles para impuestos?" |
| `meta_monto_ahorros` | Valor dos ahorros em € |
| `meta_vivienda_seleccionada` | Resposta: "Cuentas con vivienda seleccionada?" |

---

## Validação

1. ✅ Atualizar JSON no Make.com
2. ⏳ Testar com lead real do Facebook
3. ⏳ Verificar campos nas notas do lead no CRM
4. ⏳ Usar "Probar con Último Lead" para confirmar envio ao Bitrix
