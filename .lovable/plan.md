
# Plano de Correção: Agentes, Webhook e Busca de Cidades

## Resumo Executivo

Após análise detalhada, identifiquei que:

1. **Agentes inativos**: O sistema **já funciona corretamente** - o round-robin filtra por `activo = true`. Vou adicionar logs de diagnóstico para confirmar
2. **Idade no webhook**: O campo `edad` não está chegando do formulário Meta Ads - precisa verificar configuração externa. Vou melhorar o código para aceitar variantes do campo
3. **Busca de cidades**: O combobox precisa priorizar cidades que COMEÇAM com o termo pesquisado

---

## Fase 1: Corrigir Busca de Cidades (Prioridade Alta)

### Arquivo: `src/components/inventario/CiudadCombobox.tsx`

**Problema**: Pesquisar "bar" mostra "Abarán" antes de "Barcelona"

**Solução**: Ordenar resultados priorizando cidades que **começam** com o termo

```typescript
// Antes (linha 27-29)
const filteredCiudades = ciudades
  .filter(c => c.toLowerCase().includes(search.toLowerCase()))
  .slice(0, 50);

// Depois: priorizar startsWith
const searchLower = search.toLowerCase();
const filteredCiudades = ciudades
  .filter(c => c.toLowerCase().includes(searchLower))
  .sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aStartsWith = aLower.startsWith(searchLower);
    const bStartsWith = bLower.startsWith(searchLower);
    
    // Cidades que começam com o termo vêm primeiro
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // Se ambas começam ou não, ordenar alfabeticamente
    return aLower.localeCompare(bLower);
  })
  .slice(0, 50);
```

**Resultado esperado**: "bar" → Barcelona aparece primeiro, depois Abarán

---

## Fase 2: Corrigir Campo de Idade no Webhook

### Arquivo: `supabase/functions/meta-lead-webhook/index.ts`

**Problema**: `lead_edad` está sempre `null` nos webhook_logs

**Diagnóstico**: O formulário do Meta Ads pode estar enviando a idade com nome de campo diferente (ex: `age`, `fecha_nacimiento`, `ano_nacimiento`)

**Solução**: Adicionar parsing flexível para múltiplos formatos

```typescript
// Adicionar função de parsing de idade
function parseEdad(data: Record<string, any>): number | null {
  // Tentar campos conhecidos
  const possibleFields = ['edad', 'age', 'ano_nacimiento', 'fecha_nacimiento', 'birth_year'];
  
  for (const field of possibleFields) {
    if (data[field]) {
      const value = data[field];
      
      // Se é número direto
      if (typeof value === 'number') return value;
      
      // Se é string com número
      const numMatch = String(value).match(/(\d+)/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        
        // Se parece ano de nascimento (ex: 1990), calcular idade
        if (num > 1900 && num < 2020) {
          return new Date().getFullYear() - num;
        }
        
        // Se parece idade direta
        if (num > 0 && num < 120) {
          return num;
        }
      }
    }
  }
  
  return null;
}

// Usar no processamento:
const edad = parseEdad(data);
```

**Alterar também**:
- Linha 528: `calcularSimulacionHipotecaria(ingresos, deudas, edad)`
- Linha 660: `edad: edad || null`
- Linha 732: `lead_edad: edad || null`

---

## Fase 3: Adicionar Logs de Diagnóstico para Round-Robin

### Arquivo: `supabase/functions/get-next-agent/index.ts`

**Objetivo**: Confirmar que agentes inativos realmente não estão recebendo leads

**Adicionar logs detalhados**:

```typescript
// Após linha 62 (busca de agentes)
console.log(`[Round-Robin] Agentes activos encontrados (${region}):`, 
  agents.map(a => `${a.nombre} (${a.id.substring(0,8)})`).join(', '));

// Após linha 72 (verificação do tracking)
if (tracking?.last_assigned_agent_id) {
  const lastAgentActive = agents.find(a => a.id === tracking.last_assigned_agent_id);
  if (!lastAgentActive) {
    console.warn(`[Round-Robin] ⚠️ Último agente ${tracking.last_assigned_agent_id} NÃO está na lista de ativos`);
  } else {
    console.log(`[Round-Robin] Último agente: ${lastAgentActive.nombre}`);
  }
}
```

---

## Fase 4: Verificação Externa Necessária

### Configuração do Formulário Meta Ads

Para resolver definitivamente o problema de idade, você precisa verificar no Facebook Ads Manager:

1. Abra o formulário de lead no Meta Ads
2. Verifique se existe um campo perguntando a idade
3. Confirme o **nome exato** do campo (ex: `edad`, `age`, `fecha_nacimiento`)
4. Me informe o nome para ajustar o parsing

**Alternativa**: Se não houver campo de idade no formulário, você pode adicionar uma pergunta personalizada.

---

## Arquivos a Modificar

| Arquivo | Modificação | Risco |
|---------|-------------|-------|
| `src/components/inventario/CiudadCombobox.tsx` | Priorizar `startsWith` na ordenação | Baixo |
| `supabase/functions/meta-lead-webhook/index.ts` | Adicionar `parseEdad()` flexível | Baixo |
| `supabase/functions/get-next-agent/index.ts` | Adicionar logs de diagnóstico | Baixo |

---

## Testes de Validação

1. **Busca de cidades**: 
   - Pesquisar "bar" → Barcelona deve aparecer primeiro
   - Pesquisar "mad" → Madrid deve aparecer primeiro
   
2. **Webhook idade**:
   - Verificar logs após próximo lead do Meta Ads
   - Confirmar se `lead_edad` aparece quando o formulário enviar o dado

3. **Round-Robin**:
   - Verificar logs após próximo lead para confirmar nomes dos agentes ativos
   - Confirmar que agentes desativados não aparecem na lista

---

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Busca "bar" | Abarán primeiro | Barcelona primeiro |
| Campo `lead_edad` | Sempre null | Valor se Meta Ads enviar |
| Visibilidade round-robin | Sem logs | Logs detalhados |

---

## Ordem de Execução

1. **CiudadCombobox** - Fix imediato da busca
2. **meta-lead-webhook** - Adicionar parseEdad
3. **get-next-agent** - Adicionar logs diagnóstico
4. **Deploy** das edge functions

