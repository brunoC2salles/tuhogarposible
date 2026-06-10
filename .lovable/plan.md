Vou restaurar a experiência de admin sem reativar a área removida de produtos/inventário próprio.

Plano:

1. Página inicial
- Adicionar um 4º cartão/botão para acesso ao Admin, apontando para `/admin`.
- Manter os botões existentes: Portal del Agente, Simulador Financiero e Academia.
- Ajustar a grade para os 4 ficarem lado a lado em desktop e responsivos em telas menores.
- Atualizar textos da home para não falar em “inventario completo” como se ainda existisse gestão própria de produtos.

2. Página principal do admin `/admin`
- Refazer o painel com ícones apenas para features que existem e devem continuar acessíveis:
  - CRM
  - Dashboard Analítico
  - Agentes
  - Verificación de Extractos
  - Academia
  - Control Financiero
  - Portal del Agente
  - Settings
- Remover atalhos quebrados/decommissionados do painel:
  - Inventario próprio/admin de produtos
  - Templates de contrato
  - Abandonos
  - Chat Interno
  - Reclutamiento
- Corrigir o link do financeiro para `/financiero`, que é a rota existente.

3. Navegação lateral/admin
- Sincronizar o menu lateral com a nova lista de features do admin.
- Adicionar “Portal del Agente” como acesso permitido ao admin.
- Garantir que nenhum item leve para `/inventario/admin` ou outras rotas removidas.

4. Menus antigos
- Limpar o menu `AdminHeader`, caso ainda seja usado em alguma página, para evitar links quebrados para funcionalidades removidas.

Resultado esperado:
- O admin volta a conseguir acessar CRM, agentes, financeiro, academia, verificações, dashboard e configurações.
- A parte de produtos/inventário próprio continua removida.
- A home passa a ter 4 acessos alinhados lado a lado em desktop.