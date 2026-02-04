

## Plano de Correção: Filtros de Produtos e Recomendações

### Diagnóstico dos Problemas

Após análise detalhada do código e banco de dados, identifiquei os seguintes problemas:

1. **Problema Principal - Busca sem normalização de acentos**
   - O PostgreSQL com `ILIKE` é case-insensitive, mas **NÃO** ignora acentos
   - Quando buscas "alcala" → não encontra "Alcalá"  
   - Quando buscas "malaga" → não encontra "Málaga"
   - Isso afeta tanto a barra de pesquisa quanto as recomendações de leads

2. **Dados duplicados por variação de acentos**
   - Existem cidades duplicadas: "Alcalá de Guadaira" (6 registros) vs "Alcalá de Guadaíra" (3 registros)
   - Isso causa inconsistência nos resultados

3. **Dependência de extensão não instalada**
   - A extensão `unaccent` do PostgreSQL não está disponível
   - Precisamos resolver via código JavaScript

---

### Solução Proposta

A abordagem mais segura e eficiente é usar **normalização client-side** para preparar os termos de busca, mantendo a lógica do servidor simples.

#### Parte 1: Criar função utilitária de normalização

```text
src/lib/textUtils.ts (NOVO ARQUIVO)
```
- Criar função `normalizeText(text: string)` que remove acentos
- Usar o método nativo `normalize('NFD').replace(/[\u0300-\u036f]/g, '')`
- Exportar para uso em toda a aplicação

#### Parte 2: Corrigir busca no AgenteInventario

```text
src/pages/inventario/AgenteInventario.tsx
```
- Modificar a query de busca para incluir variações com e sem acentos
- Ao buscar "alcala", construir query que busque AMBOS "alcala" e padrões que possam ter acentos
- Usar abordagem híbrida: buscar resultados no servidor e filtrar adicionalmente no cliente

**Alteração específica (linhas 137-140):**
```javascript
// ANTES:
const searchLower = `%${debouncedSearchTerm.toLowerCase()}%`;
query = query.or(`ciudad.ilike.${searchLower},...`);

// DEPOIS:
// Buscar sem filtro server-side, filtrar client-side com normalização
// OU usar regex pattern mais flexível
```

#### Parte 3: Corrigir recomendações de leads

```text
src/hooks/useRecomendaciones.ts
```
- Aplicar a mesma lógica de normalização para as buscas de cidade/zona
- Garantir que leads com "ciudad_interes: Málaga" encontrem imóveis em "Málaga"

---

### Abordagem Técnica Detalhada

**Opção Escolhida: Normalização JavaScript + Busca Ampliada**

Para manter a performance e não sobrecarregar o banco:

1. **Na busca principal do inventário:**
   - Normalizar o termo de busca no frontend
   - Buscar dados paginados do servidor SEM o filtro de texto
   - Aplicar filtro de texto client-side com normalização
   - Isso funciona porque já temos paginação server-side

2. **Nas recomendações:**
   - Buscar imóveis por região/cidade sem filtro rígido
   - Filtrar client-side com texto normalizado
   - Limitar a 10 resultados após filtragem

**Alternativa (mais limpa mas requer mudança de DB):**
- Criar extensão `unaccent` no Supabase
- Criar uma coluna `ciudad_normalized` gerada automaticamente
- Indexar essa coluna para buscas rápidas

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/textUtils.ts` | NOVO - Função de normalização de texto |
| `src/pages/inventario/AgenteInventario.tsx` | Modificar busca para usar normalização |
| `src/hooks/useRecomendaciones.ts` | Aplicar normalização nas buscas de recomendação |

---

### Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Performance com filtro client-side | Manter paginação server-side, filtrar apenas a página atual |
| Complexidade adicional | Centralizar lógica em função utilitária reutilizável |
| Quebrar funcionalidade existente | Testar todos os cenários antes de deploy |

---

### Teste Esperado

Após implementação:
- Buscar "malaga" deve encontrar imóveis em "Málaga"
- Buscar "alcala" deve encontrar imóveis em "Alcalá de Henares", etc.
- Filtros de cidade, tipo, preço e quartos devem funcionar em conjunto
- Recomendações de leads devem corresponder corretamente às cidades de interesse

---

### Perguntas de Clarificação

Antes de implementar, preciso confirmar:

1. **Quantos imóveis típicos aparecem por página?** (atualmente 48) - Isso ajuda a decidir se o filtro client-side é viável
2. **A extensão `unaccent` pode ser instalada no Supabase?** - Se sim, seria a solução mais elegante
3. **Há algum caso específico de busca que não está funcionando que eu deveria testar?**

