
# Plano de Implementação: Integração Inmovilla no Portal do Agente

## Análise da Situação

### O que a API Inmovilla Oferece

Após analisar a documentação completa, a API da Inmovilla permite:
- **Buscar propriedades** (`paginacion`): até 50 por requisição
- **Obter ficha completa** (`ficha`): detalhes de 1 propriedade
- **Listar fotos** (`fotos`): imagens de cada propriedade
- **Filtrar por cidade, tipo, preço, quartos**, etc.

### Credenciais Disponíveis
```text
numagencia: 13611
addnumagencia: 244_ext  
password: *xmA8Z!WQ
```

### Limitações Críticas
- Limite de requisições por minuto (IP bloqueado por 10min se exceder)
- API baseada em PHP (precisa de proxy via Edge Function)
- Não recomendada para sincronização via cron

---

## Solução Proposta: Sincronização via API + White-label Nativo

A melhor abordagem para atingir o objetivo de **white-label completo** (logo Tu Hogar Posible, branding próprio, enviar para clientes) é:

### Fluxo de Integração

```text
Portal do Agente (Frontend)
         ↓
    Botão "Sincronizar Inmovilla"
         ↓
    Edge Function (sync-inmovilla-products)
         ↓
    API Inmovilla (PHP)
         ↓
    Tabela inmuebles (com proveedor = 'Inmovilla')
         ↓
    Agente vê produtos com branding Tu Hogar Posible
```

### Por que essa abordagem?

| Característica | Iframe | Sincronização API |
|----------------|--------|-------------------|
| White-label completo | Não | Sim |
| Logo Tu Hogar Posible | Não | Sim |
| Enviar para clientes | Limitado | Sim |
| Filtros personalizados | Não | Sim |
| Vincular a leads | Não | Sim |
| Performance | Depende do Inmovilla | Rápida |
| Dados offline | Não | Sim |

---

## Arquitetura Técnica

### Fase 1: Edge Function de Sincronização

**Arquivo**: `supabase/functions/sync-inmovilla-products/index.ts`

A função fará:
1. Chamar API Inmovilla via PHP wrapper (convertido para fetch)
2. Paginar resultados (50 por request)
3. Fazer UPSERT na tabela `inmuebles`
4. Marcar proveedor = 'Inmovilla'
5. Buscar fotos de cada propriedade

**Payload para API Inmovilla**:
```javascript
const body = new URLSearchParams({
  numagencia: '13611',
  addnumagencia: '244_ext',
  password: '*xmA8Z!WQ',
  idioma: '1',
  tipo: 'paginacion',
  posinicial: '1',
  numelementos: '50',
  where: '',
  orden: 'fechaact desc'
});

const response = await fetch('http://ycasas.es/apiemail/servidor/adjuntos/api_cliente.php', {
  method: 'POST',
  body: body
});
```

### Fase 2: Botão de Sincronização no Portal

**Arquivo**: `src/pages/inventario/AgenteInventario.tsx`

Adicionar na seção de produtos Inmovilla:
- Card dedicado "Productos Inmovilla"
- Botão "Sincronizar Ahora"
- Último sync timestamp
- Contador de produtos sincronizados

### Fase 3: Filtro por Provedor

**Arquivo**: `src/pages/inventario/AgenteInventario.tsx`

Adicionar tabs ou filtro:
- "Todos los productos"
- "Tu Hogar Posible"
- "Inmovilla"

### Fase 4: Visualização White-label

Os produtos Inmovilla aparecerão no inventário normal com:
- Logo Tu Hogar Posible
- Cards no mesmo estilo
- Página de produto pública (`/produto/{id}`) com branding próprio
- Botão de compartilhar com cliente

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/sync-inmovilla-products/index.ts` | Criar | Edge function para sincronizar |
| `supabase/config.toml` | Modificar | Adicionar config da função |
| `src/pages/inventario/AgenteInventario.tsx` | Modificar | Adicionar seção Inmovilla + botão sync |
| `src/components/inventario/InmovillaSyncSection.tsx` | Criar | Componente de sincronização |
| `src/hooks/useInmovillaSync.ts` | Criar | Hook para controlar sync |
| `src/pages/Index.tsx` | Modificar | Remover widget iframe da página inicial |

---

## Mapeamento de Campos API Inmovilla → Tabela inmuebles

| Campo API | Campo DB | Transformação |
|-----------|----------|---------------|
| `ref` | `codigo_inventario` | Direto |
| `ciudad` | `ciudad` | Direto |
| `zona` | `region` | Direto |
| `nbtipo` | `tipo` | Mapear para enum |
| `precioinmo` | `precio` | Direto |
| `habdobles + habitaciones` | `quartos` | Soma |
| `banyos + aseos` | `banheiros` | Soma |
| `m_cons` | `area_m2` | Direto |
| `foto` | `image_url` | URL completa |
| - | `proveedor` | 'Inmovilla' |
| - | `disponible` | true |

---

## Secrets Necessários

Precisamos adicionar os seguintes secrets no Supabase:

| Secret | Valor |
|--------|-------|
| `INMOVILLA_NUMAGENCIA` | 13611 |
| `INMOVILLA_ADDNUMAGENCIA` | 244_ext |
| `INMOVILLA_PASSWORD` | *xmA8Z!WQ |

---

## Considerações de Segurança

1. **Credenciais no Backend**: As credenciais da Inmovilla ficam apenas na Edge Function (nunca no frontend)
2. **Rate Limiting**: A função terá throttling para respeitar limites da API
3. **UPSERT seguro**: Usa constraint único (codigo_inventario, proveedor) para evitar duplicatas
4. **Proteção de produtos**: Produtos com reservas ou vinculados a leads não são deletados

---

## UX no Portal do Agente

### Antes (Página Inicial)
- Widget Inmovilla como iframe

### Depois (Portal do Agente)
- Seção destacada no topo: "Productos Inmovilla"
- Card com estatísticas: "X productos sincronizados"
- Botão "Sincronizar Productos" (manual, 1x por dia recomendado)
- Filtro para ver apenas produtos Inmovilla ou misturados com inventário próprio

### Fluxo do Agente

1. Agente acessa Portal
2. Vê seção "Inmovilla" no topo
3. Clica "Sincronizar" se necessário
4. Produtos aparecem no grid normal
5. Pode filtrar por "Inmovilla" para ver apenas esses
6. Clica em produto → página com logo Tu Hogar Posible
7. Compartilha URL com cliente → cliente vê branding Tu Hogar Posible

---

## Estimativa de Tempo

| Fase | Complexidade | Dependências |
|------|--------------|--------------|
| 1. Secrets | Baixa | Nenhuma |
| 2. Edge Function | Alta | Secrets |
| 3. Componentes Frontend | Média | Edge Function |
| 4. Remover iframe da Index | Baixa | Nenhuma |

---

## Validação Pós-Implementação

1. Configurar secrets no Supabase
2. Testar Edge Function via curl/invoke
3. Sincronizar alguns produtos
4. Verificar que aparecem no inventário
5. Abrir página de produto público → confirmar branding
6. Compartilhar link → cliente vê Tu Hogar Posible

---

## Alternativa: Se API Inmovilla não Funcionar

Se a API tiver problemas (bloqueio, mudança de endpoint), podemos:
1. Manter botão de link externo para CRM Inmovilla
2. Usar iframe apenas como fallback temporário
3. Contatar Inmovilla para solução dedicada

