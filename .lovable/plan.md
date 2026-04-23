

# Plano: restaurar todos os campos perdidos no payload Bitrix

## Diagnóstico

O `make-webhook-proxy` foi simplificado de mais. Faltam campos que o Bitrix consome obrigatoriamente. Em concreto:

**Campos completamente em falta (chegam vazios ao Bitrix):**
- `sim_hipoteca_valor_max_inmueble` — foi removido em vez de mantido
- `sim_personal_monto_maximo` — foi renomeado para `sim_personal_credito_max` (Bitrix continua a esperar o nome antigo)
- `meta_deudas_mensuales` — está hardcoded a `0`, nunca é populado
- `meta_dni_nie` — falta na action `send_lead_assignment`
- `lead_preferencia_llamada` — falta em `send_lead_assignment`
- `lead_habitaciones` — falta em `send_lead_assignment`
- `meta_antiguedad_trabajo` — falta em `send_lead_assignment`

**Campos OK (já chegam):** nombre, telefono, email, edad, zona, ciudad, valor_deseado, ingresos_mensuales, monto_ahorros, vivienda_seleccionada + os 3 sim_hipoteca novos.

## O que se faz

### 1. `supabase/functions/make-webhook-proxy/index.ts`

**Actualizar `buildSimFields`** para devolver os 7 campos (manter todos os nomes que o Bitrix precisa + os novos que já tinha):

```ts
function buildSimFields(simPersonal, simHipoteca) {
  return {
    // Hipoteca
    sim_hipoteca_monto_financiable:
      simHipoteca.monto_maximo_financiable || simHipoteca.montoFinanciable || 0,
    sim_hipoteca_valor_max_inmueble:        // ← RESTAURADO (Bitrix)
      simHipoteca.valor_maximo_inmueble || simHipoteca.valorInmueble || 0,
    sim_hipoteca_cuota_maxima:
      simHipoteca.cuota_maxima_mensual || simHipoteca.cuotaMensual || 0,
    sim_hipoteca_precio_max_inmueble:        // mantém-se (MIN P1+P2)
      simHipoteca.precio_maximo_inmueble || 0,

    // Personal
    sim_personal_monto_maximo:               // ← RESTAURADO (nome do Bitrix)
      simHipoteca.credito_personal_maximo || simPersonal.monto_maximo || simPersonal.montoMaximoCredito || 0,
    sim_personal_credito_max:                // mantém-se (alias novo)
      simHipoteca.credito_personal_maximo || simPersonal.monto_maximo || simPersonal.montoMaximoCredito || 0,
    sim_personal_cuota_mensual:
      simPersonal.cuota_mensual || simPersonal.cuotaMensual || 0,
  };
}
```

**Action `test_meta_bitrix_last_lead`** (linha ~432-475):
- Substituir `meta_deudas_mensuales: 0` (linha 467) por: ler de `simHipoteca.deudas_consideradas` com fallback a `extractFromNotes(lead.notas, 'Deudas mensuales')` e fallback final `0`.
- Os outros campos (dni, preferencia, habitaciones, antigüedad) já estão lá ✅.

**Action `send_lead_assignment`** (linha ~593-623):
- **Adicionar** os 4 campos que faltam, lidos de `extractFromNotes(lead.notas, ...)`:
  - `meta_dni_nie: extractFromNotes(lead.notas, 'DNI/NIE')`
  - `lead_preferencia_llamada: extractFromNotes(lead.notas, 'Preferência de chamada')`
  - `lead_habitaciones: extractFromNotes(lead.notas, 'Habitaciones')`
  - `meta_antiguedad_trabajo: extractFromNotes(lead.notas, 'Antigüedad')`
  - `meta_deudas_mensuales: simHipoteca.deudas_consideradas ?? extractFromNotes(...) ?? 0`

**Action `send_qualified_submission`** (linha ~178-220):
- Esta usa `form_submissions` (formulário web manual), não Meta Ads. Os campos `meta_*` não fazem sentido aqui. **Não tocar** nos meta_*. Só herda automaticamente os 2 nomes restaurados via `buildSimFields`.

### 2. `supabase/functions/meta-lead-webhook/index.ts`

Adicionar uma chave dentro do objecto retornado por `calcularSimulacionHipotecaria` (linha 607-617) para persistir as deudas usadas no cálculo:

```ts
return {
  monto_maximo_financiable: ...,
  valor_maximo_inmueble: ...,
  cuota_maxima_mensual: ...,
  ...
  deudas_consideradas: deudas,   // ← NOVO (para popular meta_deudas_mensuales no Bitrix)
  ingresos: ingresos,            // ← garantir que existe (alguns paths já leem)
};
```

Isto fica em `simulador_hipotecario_data` (jsonb existente) — sem migrações.

## Mapa final de campos (verificação cruzada com o template Bitrix)

| Template Bitrix | Origem | OK |
|---|---|---|
| `lead_nombre` | lead.nombre_completo | ✅ |
| `lead_telefono` | lead.telefono | ✅ |
| `lead_email` | lead.email | ✅ |
| `lead_edad` | extractFromNotes('Edad') | ✅ |
| `meta_dni_nie` | extractFromNotes('DNI/NIE') | ✅ (add em assignment) |
| `lead_preferencia_llamada` | extractFromNotes('Preferência de chamada') | ✅ (add em assignment) |
| `lead_zona_interes` | lead.zona_interes | ✅ |
| `lead_ciudad_interes` | lead.ciudad_interes | ✅ |
| `lead_ingresos_mensuales` | simHipoteca.ingresos | ✅ |
| `lead_valor_deseado` | lead.valor_inmueble_deseado | ✅ |
| `meta_deudas_mensuales` | simHipoteca.deudas_consideradas | ✅ (add chave + ler) |
| `lead_habitaciones` | extractFromNotes('Habitaciones') | ✅ (add em assignment) |
| `meta_monto_ahorros` | extractFromNotes('Ahorros para impuestos') | ✅ |
| `meta_vivienda_seleccionada` | extractFromNotes('Vivienda seleccionada') | ✅ |
| `meta_antiguedad_trabajo` | extractFromNotes('Antigüedad') | ✅ (add em assignment) |
| `sim_hipoteca_monto_financiable` | jsonb | ✅ |
| `sim_hipoteca_valor_max_inmueble` | jsonb | ✅ (restaurar em buildSimFields) |
| `sim_hipoteca_cuota_maxima` | jsonb | ✅ |
| `sim_personal_monto_maximo` | jsonb | ✅ (restaurar em buildSimFields) |

## O que NÃO se toca

- ❌ Lógica do simulador (`simuladorUtils.ts`), CRM, PDF — intactos
- ❌ Cálculos do `meta-lead-webhook` (regras 35%, cap 180k, ITP) — intactos. Só **adiciono** 1 campo (`deudas_consideradas`) ao objecto guardado
- ❌ Schema da BD — zero migrações
- ❌ Action `send_qualified_submission` (formulário web manual) — não tem dados Meta Ads, mantém-se enxuta
- ❌ Os 3 campos novos `sim_hipoteca_precio_max_inmueble` + `sim_personal_credito_max` + `sim_personal_cuota_mensual` continuam a ir (o Bitrix pode usá-los quando quiser)

## Detalhes técnicos

- **Retro-compatibilidade**: leads antigos (sem `deudas_consideradas` no jsonb) → fallback para notas → fallback `0`. Não quebra nada.
- **Performance**: zero impacto. Tudo são reads do jsonb que já se carregava.
- **Reversibilidade**: 2 ficheiros editados, deploy automático, rollback em segundos.
- **Validação**: depois do deploy, "Probar con Último Lead" no Admin Settings e confirmar nos logs do Make que os 19 campos aparecem todos preenchidos.

## Entrega

2 ficheiros tocados (`make-webhook-proxy/index.ts` e `meta-lead-webhook/index.ts`). Sem migrações.

