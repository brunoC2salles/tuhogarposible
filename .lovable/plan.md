
# Plano de Implementação: Widget Inmovilla/Casafari no Portal do Agente

## Situação Atual

### Problema Identificado
- A sincronização via API retornou **erro 403** porque você não tem produtos próprios no Inmovilla
- Você usa o Inmovilla como **portal para acessar o catálogo do Casafari**
- O Casafari tem API própria que requer contrato separado (não disponível para você)

### Credenciais do Inmovilla (painel web)
- **Oficina**: ofi13611
- **Usuario**: Albert
- **Contraseña**: 24isjp
- **URL**: https://crm.inmovilla.com/panel/

---

## Solução Proposta: Iframe Aprimorado com Branding

Como não há acesso API ao Casafari, a melhor solução é:

1. **Iframe do painel Inmovilla** no Portal do Agente
2. **Tamanho maior** (ocupando toda a área principal)
3. **Posição prioritária** (primeira seção após o header)
4. **Branding Tu Hogar Posible** em volta do iframe
5. **Remover a seção de sincronização API** (não funcional)

### Limitações do Iframe

| Característica | Possível? | Motivo |
|----------------|-----------|--------|
| Login automático | ❌ | O Inmovilla não permite autenticação via URL |
| Ocultar header Inmovilla | ❌ | O CSS é do site deles |
| Links com branding THP | ❌ | Links são do Inmovilla |
| Pesquisar produtos | ✅ | O painel Inmovilla permite pesquisa |
| Ver fotos/detalhes | ✅ | Abre dentro do iframe |

### O que podemos fazer

1. **Enquadrar o iframe** com um header "Búsqueda de Inmuebles - Tu Hogar Posible"
2. **Instrução aos agentes**: Fazer login 1x no Inmovilla, sessão é mantida
3. **Tamanho fullscreen** para melhor experiência
4. **Tab dedicada** "Casafari/Inmovilla" no portal

---

## Arquitetura da Solução

### Nova Estrutura do Portal do Agente

```
┌─────────────────────────────────────────────────────┐
│  Header (Logo Tu Hogar Posible + navegação)         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  🏢 Búsqueda Casafari - Tu Hogar Posible      │  │
│  │  ───────────────────────────────────────────  │  │
│  │                                               │  │
│  │        [IFRAME INMOVILLA - 800px altura]      │  │
│  │                                               │  │
│  │   (agente faz login 1x e pesquisa normal)     │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Tabs: [Casafari] [Inventario Propio]               │
│                                                     │
│  [Grid de produtos próprios - se tab Inventario]    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Alterações a Fazer

### Arquivo: `src/pages/inventario/AgenteInventario.tsx`

1. **Remover** a seção `InmovillaSyncSection` (sincronização API não funciona)
2. **Adicionar** tabs "Casafari" e "Inventario Propio"
3. **Tab Casafari**: Exibe o iframe do Inmovilla em tela grande
4. **Tab Inventario**: Exibe o grid de produtos próprios (Hipoges, Solvia, etc.)

### Arquivo: `src/components/inventario/InmovillaWidget.tsx`

1. **Altura padrão maior**: 800px em vez de 600px
2. **Header com branding** Tu Hogar Posible acima do iframe
3. **Instruções para login** se agente não estiver logado
4. **Botão de abrir em nova aba** como alternativa

### Arquivo: `src/pages/Index.tsx`

1. Já removemos o widget da página inicial (OK)

### Configuração: `AdminSettings.tsx`

1. Definir a URL padrão como `https://crm.inmovilla.com/panel/` ou URL específica do buscador

---

## Código do Componente Atualizado

```typescript
// InmovillaWidget.tsx - Novo design
export const InmovillaCasafariSection = () => {
  const inmovillaUrl = "https://crm.inmovilla.com/panel/";
  
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div>
              <CardTitle className="text-lg">
                Búsqueda de Inmuebles - Casafari
              </CardTitle>
              <CardDescription>
                Accede al catálogo completo de propiedades
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={inmovillaUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir en nueva pestaña
            </a>
          </Button>
        </div>
        
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Inicia sesión en Inmovilla con tus credenciales. 
            La sesión se mantiene activa mientras navegas.
          </AlertDescription>
        </Alert>
      </CardHeader>
      
      <CardContent className="p-0">
        <iframe
          src={inmovillaUrl}
          className="w-full border-0 rounded-b-lg"
          style={{ height: "800px" }}
          title="Casafari - Tu Hogar Posible"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        />
      </CardContent>
    </Card>
  );
};
```

---

## Estrutura de Tabs no Portal

```typescript
// AgenteInventario.tsx - Nova estrutura
const [activeTab, setActiveTab] = useState<'casafari' | 'inventario'>('casafari');

return (
  <main>
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="casafari" className="gap-2">
          <Building2 className="h-4 w-4" />
          Casafari / Inmovilla
        </TabsTrigger>
        <TabsTrigger value="inventario" className="gap-2">
          <Home className="h-4 w-4" />
          Inventario Propio
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="casafari">
        <InmovillaCasafariSection />
      </TabsContent>
      
      <TabsContent value="inventario">
        {/* Grid de produtos próprios (Hipoges, Solvia, etc.) */}
        <FiltrosInmuebles ... />
        <InmuebleGrid ... />
      </TabsContent>
    </Tabs>
  </main>
);
```

---

## O que Será Removido

| Componente | Motivo |
|------------|--------|
| `InmovillaSyncSection` | API retorna 403, não funciona |
| Tabs de provedor (Todos/THP/Inmovilla) | Não há produtos Inmovilla para filtrar |
| Edge function `sync-inmovilla-products` | Manter código mas não usar |
| Hook `useInmovillaSync` | Não será mais necessário |

---

## Resultado Final

### Para o Agente

1. Acessa Portal do Agente
2. Vê tab "Casafari/Inmovilla" em destaque (primeira)
3. Iframe grande com painel Inmovilla
4. Faz login 1x com suas credenciais Inmovilla
5. Pesquisa produtos normalmente
6. Pode alternar para "Inventario Propio" para ver Hipoges/Solvia

### Branding Mantido

- Header com logo Tu Hogar Posible acima do iframe
- Título "Búsqueda de Inmuebles - Tu Hogar Posible"
- Cores e estilo consistentes com o resto do portal

### Limitação Conhecida

- **Links de produtos** abrem no Inmovilla (não podem ser compartilhados com branding THP)
- Para compartilhar com cliente, agente teria que:
  1. Encontrar produto no Casafari
  2. Adicionar manualmente ao inventário próprio (se necessário)
  3. Compartilhar página pública do portal

---

## Alternativa Futura

Se você conseguir **credenciais de API do Casafari** diretamente com eles:
- Custo: Casafari cobra por acesso API
- Benefício: White-label completo
- Implementação: Já temos a estrutura da Edge Function pronta

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/inventario/InmovillaWidget.tsx` | Reformular para seção com branding |
| `src/pages/inventario/AgenteInventario.tsx` | Tabs Casafari vs Inventario + remover sync |
| `src/components/inventario/InmovillaSyncSection.tsx` | Remover do uso (arquivo pode ficar) |

---

## Perguntas Antes de Implementar

1. **A URL `https://crm.inmovilla.com/panel/` é a correta?** Ou há uma página específica de busca que você usa?

2. **Os agentes têm login individual no Inmovilla?** Ou todos usam as mesmas credenciais (ofi13611/Albert)?

3. **O tab "Casafari" deve ser o padrão** (primeira coisa que agente vê) ou prefere que "Inventario Propio" seja o padrão?
