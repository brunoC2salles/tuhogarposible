
# Plano de Implementação: Novas Perguntas Meta Ads + Validação Round-Robin

## 1. Verificação do Sistema Round-Robin

**Status: ✅ JÁ FUNCIONA CORRETAMENTE**

O código atual já implementa corretamente a exclusão de agentes inativos:

- **get-next-agent** (linha 64): Filtra apenas agentes com `activo = true`
- **AdminAgentes.tsx** (função `toggleAgentStatus`): Atualiza o banco instantaneamente
- O round-robin pula agentes desativados automaticamente

**Não é necessária nenhuma alteração no código.**

---

## 2. Novas Perguntas do Formulário Meta Ads

### Campos a adicionar:

| Campo | Pergunta | Impacto na Qualificação |
|-------|----------|-------------------------|
| `tiene_ahorros_impuestos` | Cuentas con ahorros disponibles para impuestos sobre la compra? | ❌ Não afeta |
| `monto_ahorros` | Cuánto? (monto de ahorros) | ❌ Não afeta |
| `tiene_vivienda_seleccionada` | Cuentas con la vivienda de tu interés selecionada? | ❌ Não afeta |

---

## 3. Alterações Necessárias

### 3.1 Arquivo: `supabase/functions/meta-lead-webhook/index.ts`

#### Interface MetaLeadData (linha 29-46)
Adicionar os novos campos:
```typescript
interface MetaLeadData {
  // ... campos existentes ...
  tiene_ahorros_impuestos?: string;
  monto_ahorros?: string | number;
  tiene_vivienda_seleccionada?: string;
}
```

#### Sanitização (linha 511-520)
Adicionar sanitização dos novos campos:
```typescript
data.tiene_ahorros_impuestos = sanitizeField(data.tiene_ahorros_impuestos) as string | undefined;
data.monto_ahorros = sanitizeField(data.monto_ahorros) as string | number | undefined;
data.tiene_vivienda_seleccionada = sanitizeField(data.tiene_vivienda_seleccionada) as string | undefined;
```

#### Notas do Lead (linha 664-674)
Adicionar os novos campos às notas:
```typescript
const notasLead = [
  // ... campos existentes ...
  `Ahorros para impuestos: ${data.tiene_ahorros_impuestos || 'não especificado'} - ${data.monto_ahorros || '0'}€`,
  `Vivienda seleccionada: ${data.tiene_vivienda_seleccionada || 'não especificado'}`,
].filter(Boolean).join('\n');
```

#### Payload para Bitrix (linha 779-842)
Adicionar os novos campos ao payload:
```typescript
const bitrixPayload = {
  // ... campos existentes ...
  
  // NOVOS CAMPOS DO FORMULÁRIO META
  meta_tiene_ahorros: data.tiene_ahorros_impuestos || null,
  meta_monto_ahorros: data.monto_ahorros || 0,
  meta_vivienda_seleccionada: data.tiene_vivienda_seleccionada || null,
};
```

---

### 3.2 Arquivo: `supabase/functions/make-webhook-proxy/index.ts`

#### Action `test_meta_bitrix_last_lead` (linha 447-475)
Adicionar extração dos novos campos das notas:
```typescript
meta_tiene_ahorros: extractFromNotes(lead.notas, 'Ahorros para impuestos'),
meta_monto_ahorros: extractFromNotes(lead.notas, 'Ahorros para impuestos')?.match(/(\d+)/)?.[1] || '',
meta_vivienda_seleccionada: extractFromNotes(lead.notas, 'Vivienda seleccionada'),
```

#### Action `send_lead_assignment` (linha 580-610)
Adicionar os mesmos campos ao payload:
```typescript
meta_tiene_ahorros: extractFromNotes(lead.notas, 'Ahorros para impuestos'),
meta_monto_ahorros: extractFromNotes(lead.notas, 'Ahorros para impuestos')?.match(/(\d+)/)?.[1] || '',
meta_vivienda_seleccionada: extractFromNotes(lead.notas, 'Vivienda seleccionada'),
```

---

## 4. Código JSON para Make.com

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

**IMPORTANTE:** Os nomes dos campos do Facebook (`1.data.xxx`) podem variar. Verifique no Make.com quais são os nomes exatos das novas perguntas e ajuste conforme necessário.

---

## 5. Resumo de Alterações

| Arquivo | Alteração | Risco |
|---------|-----------|-------|
| `meta-lead-webhook/index.ts` | Adicionar 3 campos na interface, sanitização, notas e payload | Baixo |
| `make-webhook-proxy/index.ts` | Adicionar extração dos 3 campos em 2 actions | Baixo |

---

## 6. Fluxo de Dados

```text
Facebook Lead Ads
       ↓
    Make.com (JSON atualizado)
       ↓
meta-lead-webhook
  → Recebe: tiene_ahorros_impuestos, monto_ahorros, tiene_vivienda_seleccionada
  → Salva nas notas do lead
  → Envia ao Bitrix: meta_tiene_ahorros, meta_monto_ahorros, meta_vivienda_seleccionada
       ↓
    Bitrix24
```

---

## 7. Validação Pós-Implementação

1. Atualizar o código JSON no Make.com
2. Testar com um lead real do Facebook (ou simular via Make.com)
3. Verificar se os campos aparecem nas notas do lead no CRM
4. Usar "Probar con Último Lead" para confirmar que chegam ao Bitrix
5. Verificar nos logs do webhook se os campos estão no payload
