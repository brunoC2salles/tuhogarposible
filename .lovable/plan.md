## Objetivo

Reorganizar a área de "Inventario" do Portal del Agente em 3 botões/abas: **Inmovilla** (mantém o iframe atual), **Productos Bancarios** (link externo Solvia) e **Productos Fuera de Cartera** (link externo Idealista). Eliminar completamente o inventário próprio (frontend, backend, tabelas e dados). Manter o design system atual (primary `#0000FF`, header minimalista, shadcn).

## 1. Frontend — Portal del Agente

**Arquivo:** `src/pages/inventario/AgenteInventario.tsx`

Reescrever o conteúdo (mantendo header/Logo/signOut atuais) para exibir 3 cards/tabs:

- **Inmovilla** — renderiza `<InmovillaCasafariSection />` (sem mudanças).
- **Productos Bancarios** — botão/card que abre `https://www.solvia.es/es/login-profesional` em nova aba (`target="_blank" rel="noopener noreferrer"`).
- **Productos Fuera de Cartera** — botão/card que abre `https://www.idealista.com/` em nova aba.

Layout: usar o componente `Tabs` já existente (Inmovilla como aba padrão) OU 3 cards no estilo da home. Vou usar **Tabs** (já é o padrão dessa página) e, nas duas abas de link externo, exibir um card com descrição curta + botão "Abrir" que dispara `window.open(url, '_blank', 'noopener,noreferrer')`. Sem iframe (Solvia/Idealista bloqueiam X-Frame-Options).

**Remover do arquivo:**
- Toda lógica de `useInmuebles`, `useReservas`, filtros, paginação, busca, RPC `get_distinct_filter_values`.
- Imports não usados (Skeleton, FiltrosInmuebles, InmuebleCard, supabase, matchesAnyField, etc).
- Aba "Inventario Propio" e todo seu `<TabsContent>`.

## 2. Frontend — Home e rotas

- **`src/pages/Index.tsx`**: remover o card "Panel de Administración" (apontava para `/inventario/admin`). Manter os outros 3 cards (Agente, Simulador, Academia).
- **`src/App.tsx`**: remover rotas `/inventario/admin` e `/produto/:id`. Remover imports de `AdminInventario` e `ProdutoPublico`.
- **Sidebar admin** (`src/components/admin/AdminSidebar.tsx`): se existir item para "Inventario"/"Base de dados de produtos", removê-lo. (Vou verificar e retirar só se existir; CRM/Agentes/Financiero/Academia/Settings/Dashboard ficam.)

## 3. Arquivos a deletar

- `src/pages/inventario/AdminInventario.tsx`
- `src/pages/ProdutoPublico.tsx`
- `src/components/inventario/InmuebleCard.tsx`
- `src/components/inventario/EditInmuebleModal.tsx`
- `src/components/inventario/CreateReservaModal.tsx`
- `src/components/inventario/SolicitarVisitaModal.tsx`
- `src/components/inventario/FiltrosInmuebles.tsx`
- `src/components/inventario/CiudadCombobox.tsx`
- `src/components/inventario/ScrapingModal.tsx`
- `src/components/inventario/InmovillaWidget.tsx` (não usado; `InmovillaCasafariSection` é o ativo)
- `src/hooks/useInmuebles.ts`
- `src/hooks/useReservas.ts`
- `src/hooks/useLeadInmuebles.ts`
- `src/hooks/useRecomendaciones.ts`
- `src/types/inventario.ts`

**Manter:** `src/components/inventario/InmovillaCasafariSection.tsx` (é o iframe Inmovilla — não mexer).

## 4. CRM — Remover bloco de Recomendaciones

- **`src/components/crm/LeadDetailsModal.tsx`**: remover seção de `recomendaciones` (header com contador, lista, hook `useRecomendaciones`, condicionais de empty state). Remover também a aba/bloco de inmuebles vinculados (depende de `useLeadInmuebles`).
- **`src/components/crm/RecomendacionesModal.tsx`** e **`src/components/crm/AgentLeadsKanbanModal.tsx`** (estado `recomendacionesLead` e import): remover o modal e o gatilho. Apagar arquivo `RecomendacionesModal.tsx`.
- **`src/components/crm/LeadCard.tsx`**: campo `valor_inmueble_deseado` continua exibido (é input do lead, não depende de inmuebles).
- Conservar campo `valor_inmueble_deseado` em formulário/tabela leads (não tem relação com a tabela inmuebles).

## 5. Edge functions — limpar referências a inmuebles

- **`supabase/functions/make-webhook-proxy/index.ts`**: remover lógica de busca de recomendações em `inmuebles` (deixar payload sem o campo `recomendaciones`). Documentado em `mem://features/webhook-recommendation-logic-v8` — vou atualizar a memória.
- **`supabase/functions/inventory-xml/index.ts`**, **`scrape-all-products`**, **`scrape-product-images`**, **`scraping-status`**, **`test-scrape-images`**, **`sync-inmovilla-products`**: deletar (não fazem mais sentido sem tabela `inmuebles`).
- **`supabase/functions/disqualified-lead-webhook/index.ts`** e **`meta-lead-webhook/index.ts`**: revisar e remover qualquer leitura de `inmuebles`/`lead_inmuebles` (se houver).

## 6. Migração de banco — DROP completo

Migration única, em ordem segura (FKs primeiro):

```sql
-- 1. Triggers e funções dependentes
DROP TRIGGER IF EXISTS ... ON public.inmuebles;
DROP FUNCTION IF EXISTS public.auto_insert_scraping_queue() CASCADE;
DROP FUNCTION IF EXISTS public.get_distinct_filter_values() CASCADE;
DROP FUNCTION IF EXISTS public.get_protected_inmuebles(text) CASCADE;

-- 2. Tabelas dependentes
DROP TABLE IF EXISTS public.scraping_progress CASCADE;
DROP TABLE IF EXISTS public.reservas CASCADE;
DROP TABLE IF EXISTS public.lead_inmuebles CASCADE;

-- 3. Tabela principal
DROP TABLE IF EXISTS public.inmuebles CASCADE;
```

(Storage buckets `lead-recordings`, `training-materials`, etc. não são afetados. Não tocar em buckets.)

Após aprovação da migration, o `types.ts` regenera automaticamente — só então faço o resto das edições de código que dependem dos tipos.

## 7. Memória do projeto

Atualizar `mem://index.md` e criar `mem://maintenance/own-inventory-removal`:
- Inventário próprio decomissionado em definitivo.
- Portal del Agente passa a ter apenas Inmovilla + 2 links externos.
- Tabelas `inmuebles`, `reservas`, `lead_inmuebles`, `scraping_progress` removidas; edge functions de scraping/inventory-xml removidas.
- CRM não tem mais bloco de recomendaciones.

## Fora de escopo

- Iframe Inmovilla / Casafari (intocado).
- Simuladores, CRM kanban, fluxo de leads, faturação, academia — sem alterações.
- Branding/design tokens — sem alterações (continua usando `--primary` azul, cards shadcn).
- Storage buckets e outras tabelas — sem alterações.

## Ordem de execução

1. Criar migration DROP (aprovação do usuário).
2. Após migration, deletar edge functions de scraping/inventory.
3. Reescrever `AgenteInventario.tsx` (3 botões).
4. Limpar `Index.tsx`, `App.tsx`, `AdminSidebar.tsx`.
5. Limpar `LeadDetailsModal.tsx`, `AgentLeadsKanbanModal.tsx`, `make-webhook-proxy`.
6. Apagar arquivos órfãos listados na seção 3.
7. Verificar build (typecheck automático) e preview.
