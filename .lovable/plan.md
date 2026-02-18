
# Plano de Implementação: 5 Ajustes na Plataforma

## Resumo das Mudanças

5 alterações independentes, ordenadas da mais simples à mais complexa:

1. Renomear textos "Casafari/Inmovilla" → "Colaboraciones" no portal do agente
2. Remover o bloco "Controle Financiero" da página inicial (Index)
3. Remover acesso ao CRM do portal do agente (manter apenas no admin)
4. Renomear "Academia de Agentes" → "Academia y Documentos" no menu inicial
5. Unificar os dois simuladores num único formulário com resultado e PDF combinados

---

## Análise Detalhada por Ponto

---

### 1. Renomear "Casafari/Inmovilla" → "Colaboraciones"

**Arquivos afetados:**
- `src/pages/inventario/AgenteInventario.tsx` — texto das tabs
- `src/components/inventario/InmovillaCasafariSection.tsx` — título do card

**Mudanças:**
- Tab: `"Casafari / Inmovilla"` → `"Colaboraciones"` (versão desktop) e `"Casafari"` → `"Colaboraciones"` (versão mobile)
- Valor da tab: manter `value="casafari"` (interno, não visível ao utilizador) para não quebrar a lógica de state
- Card title: `"Búsqueda de Inmuebles - Casafari"` → `"Compartición Inmobiliarias"`

**Risco:** Zero. Apenas texto visual.

---

### 2. Remover "Controle Financiero" da página inicial

**Arquivos afetados:**
- `src/pages/Index.tsx` — remover o card "Controle Financiero"

**O que NÃO se toca:**
- A rota `/financiero` continua existindo no `App.tsx`
- O `ControleFinanceiro.tsx` continua existindo (acesso via admin)
- `AdminHeader.tsx`, `AdminDashboardCentral.tsx`, `AdminSidebar.tsx` — continuam com o link para financeiro
- `SupervisorFinanceiro.tsx` — continua existindo para supervisores

**Apenas remove** o card da página pública `Index.tsx`. O acesso ao financeiro continua disponível para quem navegar diretamente via admin panel.

**Risco:** Zero. Apenas remove um card da homepage.

---

### 3. Remover CRM do portal do agente / acesso apenas via admin

**O que o utilizador quer:** Apenas o Admin deve ter acesso ao CRM e aos leads. Retirar do menu principal.

**Análise de impacto crítica:**
- A rota `/inventario/agente/crm` carrega `AgenteCRM.tsx` que usa `useLeads()` — este hook filtra leads pelo `agente_asignado_id` do utilizador logado. Agentes veem apenas os seus próprios leads
- O sistema de qualificação de leads (via `meta-lead-webhook`) não depende desta rota
- O `ProtectedRoute` da rota de agente não tem restrição de role específica (qualquer autenticado pode aceder)

**Mudanças a fazer:**
- `src/pages/Index.tsx` — remover o card "CRM - Gestión de Leads" (link para `/inventario/agente/crm`)
- `src/pages/inventario/AgenteInventario.tsx` — remover o botão "CRM" do header (desktop e mobile dropdown)
- `src/App.tsx` — alterar a rota `/inventario/agente/crm` para `requireAdmin` (só admins acedem)
- `src/pages/AgentSettings.tsx` — há um `navigate("/inventario/agente/crm")`, substituir por `navigate("/inventario/agente")`

**O que NÃO se toca:**
- `src/pages/inventario/AdminCRM.tsx` — continua intacto (acesso admin)
- `src/pages/inventario/AgenteCRM.tsx` — o ficheiro continua existindo (ainda usado pela rota de admin via SupervisorCRM)
- Toda a lógica de leads, RLS, webhooks — não se toca em nada do backend
- `AdminSidebar.tsx` e `AdminHeader.tsx` — continuam com links para o CRM admin

**Risco:** Baixo. As funções de qualificação são do Edge Function `meta-lead-webhook` e não dependem da rota de agente.

---

### 4. Renomear "Academia de Agentes" → "Academia y Documentos"

**Arquivos afetados:**
- `src/pages/Index.tsx` — apenas o `CardTitle` e a `CardDescription`

**Risco:** Zero. Apenas texto visual.

---

### 5. Unificar os dois simuladores num único formulário

Este é o ponto mais complexo e requer atenção especial.

**Estado atual:**
- `/simuladores/credito-personal` → formulário simples (dados pessoais + financeiros + aceite privacidade)
- `/simuladores/credito-hipotecario` → formulário complexo com Accordion (titulares, vivienda, laboral, financiero, personal)
- Cada um tem o seu próprio resultado (dialog) e PDF separado

**O que o utilizador quer:**
- Um único formulário que combina os dois
- Resultado que mostra crédito pessoal e hipotecário juntos
- PDF unificado com os dois resultados

**Abordagem escolhida:**
Criar uma nova página unificada `/simuladores` (que substitui o `SimuladoresIndex` atual) com abas ou sequência:
1. O formulário do hipotecário (o mais completo) serve de base — já contém todos os campos do pessoal (nome, idade, ingresos, deudas)
2. Adicionar os campos específicos do pessoal que faltam (entrada, valor inmueble, plazo, tasa de interés pessoal)
3. Ao submeter, calcular AMBOS os resultados simultaneamente
4. Mostrar resultado combinado num único diálogo/secção
5. Exportar PDF combinado

**Arquivos a criar/modificar:**
- `src/pages/simuladores/SimuladoresIndex.tsx` — transformar em página com o formulário unificado (ao invés de redirecionar para sub-páginas)
- `src/components/simuladores/ResultadosCombinados.tsx` (NOVO) — componente de resultados unificado
- `src/lib/pdfGenerator.ts` — adicionar função `generateSimulacionCombinadaPDF()` que junta os dois

**Páginas individuais:**
- `SimuladorPersonalPage.tsx` e `SimuladorHipotecarioPage.tsx` — mantidas para compatibilidade com links diretos via CRM (o `SimuladoresModal.tsx` abre estas páginas com `leadId` nos params). Estas continuam funcionando independentemente.

**Estrutura do formulário unificado:**

```text
SIMULADOR UNIFICADO
├── [SECÇÃO COMPARTILHADA] Datos Personales
│   ├── Nombre, Edad, Nº Titulares
│   ├── Situación Laboral, Ingresos, Deudas
│   └── Estado Civil, etc.
│
├── [SECÇÃO CRÉDITO PESSOAL]
│   ├── Valor del Inmueble Deseado
│   ├── Entrada (pago inicial)
│   ├── Plazo (meses, 60-144)
│   └── Tasa Anual (3-12%)
│
├── [SECÇÃO HIPOTECÁRIO]
│   ├── Precio de Vivienda
│   ├── Comunidad Autónoma
│   ├── Familia numerosa / Menor 35
│   └── Ahorros Disponibles
│
└── [ACEITE PRIVACIDADE]
    └── Checkbox consentimiento
```

**Resultado combinado mostra:**
- Sección 1: Crédito Personal (cuota, máximo crédito, cualificado/no)
- Sección 2: Crédito Hipotecário (cuota, monto financiable, capacidad, gastos)

**PDF unificado:** Uma única função que gera PDF com ambas as simulações numa sequência lógica.

---

## Lista Completa de Arquivos a Modificar

| Arquivo | Tipo | Mudança |
|---|---|---|
| `src/pages/Index.tsx` | Editar | Remover card CRM; Remover card Financiero; Renomear Academia |
| `src/pages/inventario/AgenteInventario.tsx` | Editar | Renomear tabs Casafari; Remover botão CRM do header |
| `src/components/inventario/InmovillaCasafariSection.tsx` | Editar | Renomear título do card |
| `src/App.tsx` | Editar | Rota `/inventario/agente/crm` passa a `requireAdmin` |
| `src/pages/AgentSettings.tsx` | Editar | Redirecionar de `/inventario/agente/crm` para `/inventario/agente` |
| `src/pages/simuladores/SimuladoresIndex.tsx` | Editar | Transformar em formulário unificado |
| `src/components/simuladores/ResultadosCombinados.tsx` | NOVO | Componente de resultados combinados |
| `src/lib/pdfGenerator.ts` | Editar | Adicionar `generateSimulacionCombinadaPDF()` |

---

## Sequência de Implementação

1. Mudanças de texto simples (Index, InmovillaCasafariSection, AgenteInventario)
2. Restrição de acesso ao CRM (App.tsx + AgentSettings.tsx)
3. Simuladores unificados (SimuladoresIndex + ResultadosCombinados + pdfGenerator)

---

## Pontos de Atenção / Garantias

- **Backend/DB:** Zero mudanças no banco de dados, RLS, triggers ou Edge Functions
- **Qualificação de leads:** O fluxo via `meta-lead-webhook` é completamente independente das rotas frontend
- **Links no CRM:** `SimuladoresModal.tsx` abre as páginas individuais com `leadId` → continuam funcionando
- **Supervisores:** `SupervisorCRM` e `SupervisorFinanceiro` não são afetados
- **Performance:** Nenhuma query nova, nenhum hook novo desnecessário
