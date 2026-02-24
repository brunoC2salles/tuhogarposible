
# Plano de Implementacao: Regioes Multi-Selecao, Simulador DNI/NIE e Round-Robin

## Resumo das Mudancas

4 blocos de alteracoes:

1. **Migrar regiao de texto simples para array** (DB + frontend + edge functions)
2. **Round-robin multi-regiao** (edge function get-next-agent + meta-lead-webhook)
3. **Simulador: DNI vs NIE = 90% vs 80% + minimo 350EUR** (simuladorUtils.ts + schema + UI)
4. **Garantir idade no webhook Bitrix** (verificacao — ja esta implementado)

---

## 1. Migracao da Base de Dados

**Migracao SQL:**

```sql
-- Mudar region_round_robin de text para text[]
ALTER TABLE profiles 
  ALTER COLUMN region_round_robin TYPE text[] 
  USING CASE 
    WHEN region_round_robin = 'General' THEN ARRAY['Andalucía','Aragón','Principado de Asturias','Islas Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y León','Comunidad Valenciana','Extremadura','Galicia','La Rioja','Comunidad de Madrid','Región de Murcia','Ceuta','Melilla']
    WHEN region_round_robin = 'Cataluña' THEN ARRAY['Cataluña']
    WHEN region_round_robin IS NULL THEN NULL
    ELSE ARRAY[region_round_robin]
  END;
```

**Nota:** A tabela `agent_assignment_tracking` usa `region` como texto para tracking do round-robin. Com multi-regiao, o tracking passa a ser feito por comunidade autonoma individual (cada comunidade tem o seu proprio tracking).

---

## 2. Lista de Comunidades Autonomas (constante partilhada)

Usar em todos os ficheiros que precisam:

```
Andalucía, Aragón, Principado de Asturias, Islas Baleares, Canarias, 
Cantabria, Castilla-La Mancha, Castilla y León, Cataluña, 
Comunidad Valenciana, Extremadura, Galicia, La Rioja, 
Comunidad de Madrid, Región de Murcia, Ceuta, Melilla
```

(17 comunidades no total - as 15 pedidas + Ceuta e Melilla para completude)

---

## 3. Ficheiros a Modificar

### 3.1. Frontend — AgentSettings.tsx

**Mudanca:** Substituir o `Select` de regiao unica por checkboxes multi-selecao (igual ao padrao dos turnos).

- `formData.region_round_robin` muda de `string` para `string[]`
- UI: Lista de checkboxes com as 17 comunidades
- Salvar: `region_round_robin: formData.regiones` (array)
- Botao "Seleccionar Todas" / "Deseleccionar Todas" para conveniencia

### 3.2. Frontend — AdminAgentes.tsx

**Mudanca:** 
- Substituir o `Select` de regiao no modal de edicao por checkboxes multi-selecao
- Atualizar filtro por regiao na tabela (agora filtra por "contem regiao X")
- Mostrar badges com as regioes selecionadas na tabela (ex: "3 regiones")

### 3.3. Frontend — AgenteDetails.tsx

**Mudanca:** Mostrar array de regioes como badges em vez de texto unico.

### 3.4. Edge Function — get-next-agent/index.ts

**Mudanca completa da logica:**

**Antes:** Recebe `region: "Cataluña" | "General"`, filtra agentes por `eq('region_round_robin', region)`.

**Depois:** 
- Recebe `region: "Cataluña"` (comunidade autonoma especifica detectada do lead)
- Busca TODOS os agentes ativos
- Filtra os que tem a comunidade no seu array `region_round_robin` (usando `contains`)
- Se nenhum agente tem essa regiao, **fallback**: selecionar o agente com MAIS regioes selecionadas (nunca deixar lead sem agente)
- Round-robin tracking por comunidade autonoma (upsert na tabela com region = comunidade especifica)

**Logica de fallback para localizacao desconhecida:**
- Se `region` vier como `null` ou nao corresponder a nenhuma comunidade, buscar o agente com mais regioes selecionadas

```typescript
// Pseudocodigo
const agentesComRegiao = allAgents.filter(a => 
  a.region_round_robin?.includes(region)
);

if (agentesComRegiao.length === 0) {
  // Fallback: agente com mais regioes
  const agentePorCobertura = allAgents.sort((a, b) => 
    (b.region_round_robin?.length || 0) - (a.region_round_robin?.length || 0)
  );
  agents = agentePorCobertura;
}
```

### 3.5. Edge Function — meta-lead-webhook/index.ts

**Mudanca:** Atualizar `determinarRegion()` para retornar a comunidade autonoma especifica em vez de apenas "General"/"Cataluña".

```typescript
function determinarRegion(zonaInteres?: string): string | null {
  // Mapa expandido de cidades -> comunidade autonoma
  const ciudadesMap = {
    'madrid': 'Comunidad de Madrid',
    'barcelona': 'Cataluña',
    'valencia': 'Comunidad Valenciana',
    'sevilla': 'Andalucía',
    'malaga': 'Andalucía',
    'zaragoza': 'Aragón',
    'murcia': 'Región de Murcia',
    'bilbao': 'Cataluña', // corrigir: Pais Vasco nao esta na lista
    // ... etc
  };
  // Retorna null se nao encontrar (triggera fallback)
}
```

**Nota importante:** O `parseZonaInteres()` ja existe e extrai cidade/regiao. Vou reaproveitar e apenas expandir o mapeamento para retornar comunidades autonomas corretas.

### 3.6. Simulador — simuladorUtils.ts

**3 mudancas:**

#### A) Novo campo: tipoDocumento (DNI vs NIE)

Adicionar ao `DatosSimulacionHipoteca`:
```typescript
tipoDocumento: 'dni' | 'nie';
```

#### B) Regra de financiamento por tipo de documento

Atualizar `calcularPorcentajeFinanciamiento()`:

**Regras atuais (erradas):**
- Nao residente fiscal: 70%
- Vivienda habitual + residente: funcionario 100%, indefinido 90%, temporal 0%

**Regras novas (corretas):**
- Nao residente fiscal: 70% (mantida)
- DNI (espanhol): maximo 90% para vivienda habitual
- NIE (imigrante): maximo 80% para vivienda habitual  
- Funcionario: mantem 100% (so se DNI)
- Inversao: 50%, segunda residencia: 70% (mantidas)

```typescript
// Nova logica
if (finalidadCompra === 'vivienda_habitual' && esResidenteFiscal) {
  if (tipoDocumento === 'dni') {
    // Espanhol: ate 90% (funcionario pode 100%)
    if (mejorContrato === 'funcionario') limitaciones.push(100);
    else if (['interino','fijo_discontinuo','indefinido'].includes(mejorContrato)) limitaciones.push(90);
    else limitaciones.push(0);
  } else {
    // NIE/imigrante: ate 80%
    if (mejorContrato === 'temporal') limitaciones.push(0);
    else limitaciones.push(80);
  }
}
```

#### C) Minimo 350EUR de capacidade de pagamento

No `calcularSimulacionHipoteca()`, adicionar validacao:

```typescript
// Apos calcular hipotecaMaximaMensual
const aprobablePorIngresos = cuotaMensual <= hipotecaMaximaMensual && hipotecaMaximaMensual >= 350;
```

E no credito pessoal (`calcularAmortizacionFrancesa`):
```typescript
const capacidadMensual = (ingresos * 0.35) - deudas;
const cualificado = capacidadMensual >= 350;
```

### 3.7. Schema — simuladorSchema.ts

Adicionar campo `tipoDocumento`:
```typescript
tipoDocumento: z.enum(['dni', 'nie'], {
  required_error: 'Debe seleccionar tipo de documento'
}),
```

### 3.8. UI Simulador — SimuladoresIndex.tsx

Adicionar campo de selecao DNI/NIE no formulario (secao dados pessoais):
```html
<Label>Tipo de documento *</Label>
<RadioGroup>
  <RadioGroupItem value="dni" /> DNI (Ciudadano español)
  <RadioGroupItem value="nie" /> NIE (Residente extranjero)
</RadioGroup>
```

### 3.9. ResultadosCombinados.tsx

Atualizar para mostrar mensagem quando `hipotecaMaximaMensual < 350`:
- "Capacidad de pago insuficiente (minimo 350EUR)"

---

## 4. Idade no Webhook Bitrix

**Verificacao:** O campo `lead_edad` JA esta incluido no payload do Bitrix (linha 863 do meta-lead-webhook):
```typescript
lead_edad: edadParsed || null,
```

E o `parseEdad()` ja funciona corretamente. **Nao e necessaria nenhuma alteracao.** Apenas confirmo que esta implementado.

---

## 5. Supabase Types — types.ts

Atualizar o tipo de `region_round_robin` de `string | null` para `string[] | null` nas interfaces Row, Insert e Update.

---

## Sequencia de Implementacao

1. Migracao SQL (alterar coluna para array, migrar dados existentes)
2. Atualizar types.ts
3. Frontend: AgentSettings, AdminAgentes, AgenteDetails (multi-selecao)
4. Edge Functions: get-next-agent (multi-regiao + fallback)
5. Edge Function: meta-lead-webhook (determinarRegion expandido)
6. Simulador: schema + utils + UI (DNI/NIE + minimo 350EUR)
7. Deploy edge functions

---

## Arquivos a Modificar

| Arquivo | Tipo | Mudanca |
|---|---|---|
| SQL Migration | Criar | ALTER TABLE profiles, alterar region_round_robin para text[] |
| `src/integrations/supabase/types.ts` | Editar | region_round_robin: string[] |
| `src/pages/AgentSettings.tsx` | Editar | Multi-selecao de regioes |
| `src/pages/AdminAgentes.tsx` | Editar | Multi-selecao no modal + filtro + display |
| `src/pages/AgenteDetails.tsx` | Editar | Mostrar array de regioes |
| `supabase/functions/get-next-agent/index.ts` | Editar | Logica multi-regiao + fallback |
| `supabase/functions/meta-lead-webhook/index.ts` | Editar | determinarRegion() expandido |
| `src/lib/simuladorUtils.ts` | Editar | tipoDocumento + 350EUR minimo |
| `src/schemas/simuladorSchema.ts` | Editar | Adicionar tipoDocumento |
| `src/pages/simuladores/SimuladoresIndex.tsx` | Editar | Campo DNI/NIE na UI |
| `src/components/simuladores/ResultadosCombinados.tsx` | Editar | Mostrar alerta 350EUR |

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Migracao DB quebrar queries existentes | A query do get-next-agent usa `eq()` que nao funciona com arrays — sera atualizada para `contains()` |
| Leads sem regiao ficarem sem agente | Fallback para agente com mais regioes garante que NUNCA ficam sem agente |
| Simulador individual (CRM) quebrar | Adicionar valor default para tipoDocumento nos simuladores individuais |
| agent_assignment_tracking com regioes antigas | Criar novos registros por comunidade conforme necessario (upsert) |

---

## Secao Tecnica: Detalhes da Query Supabase para Arrays

Para filtrar agentes que contem uma regiao especifica no array:
```typescript
// PostgREST: contains operator
.contains('region_round_robin', [region])
```

Para a migracao, o `USING CASE` converte automaticamente os dados existentes:
- "General" -> array com 16 comunidades (todas exceto Cataluña)
- "Cataluña" -> ['Cataluña']
- NULL -> NULL
