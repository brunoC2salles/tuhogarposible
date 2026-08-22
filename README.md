# tuhogarposible

## Lovable Instruction Block – Inventario Tu Hogar Posible

Objetivo: Criar uma plataforma de inventário imobiliário para a startup "Tu Hogar Posible". O sistema deve permitir que agentes visualizem imóveis disponíveis para venda, filtrem por critérios claros, solicitem reservas de visitas, e que administradores gerenciem imóveis e contas de agentes. Todo o sistema deve estar em espanhol europeu.

Localização:

* Arquivo/Componente: /app/inventario/*
* Não modificar: /auth/*, /layout/base.tsx, outros módulos já existentes

Especificações:

**Módulo Agentes:**
- Visualização em cards dos imóveis disponíveis
- Campos principais visíveis no card:
  - Ciudad (Región)
  - Tipo de inmueble
  - Precio
  - Dirección
- Informações complementares mostradas ao expandir o card:
  - ID del inmueble
  - Proveedor
- Filtros de búsqueda intuitivos por:
  - Ciudad (dropdown)
  - Tipo de inmueble (dropdown)
  - Rango de precio (slider)
- Ação no card: "Solicitar visita"
  - Abre modal para agendar fecha y hora
  - Estado de "Solicitud pendiente" vinculado al agente

**Módulo Administrador:**
- CRUD de inmuebles (crear, editar, eliminar)
- Asignar inmuebles a agentes específicos
- Crear cuentas de agentes con email + contraseña
- Dashboard con lista de agentes y sus reservas pendientes
- Botón "Subir CSV" para importar nuevos inmuebles
  - Formato CSV esperado: ID, Ciudad, Tipo, Precio, Dirección, Proveedor

**Design:**
- Estilo: moderno, claro, fluido, bien conectado
- Fondo: blanco
- Tipografía: negra
- Botones y detalles: azul celeste (#00BFFF aproximado)
- Layout: grid responsivo con cards de esquinas redondeadas (rounded-2xl) y sombra sutil
- Animaciones:
  - Fade-in en carga de cards
  - Hover suave en botones y cards

**Responsividade:**
- Mobile-first (375px base)
- Cards adaptáveis em grid 1 col (mobile), 2 col (md), 3+ col (lg)
- Filtros colapsáveis en mobile (accordion)

Restrições Críticas:

* Under no circumstances change any other parts of the app
* Testar antes de publicar: CRUD, filtros, upload CSV
* Interfaces TypeScript coerentes (types: `Inmueble`, `Agente`, `Reserva`)
* Implementar estados de loading y error en cada acción
* Logs prefixados: console.log('[Inventario]', ...)

Critérios de Sucesso:
[ ] Cards exibem imóveis com dados corretos  
[ ] Filtros de búsqueda funcionam en desktop y mobile  
[ ] Solicitud de visita crea entrada vinculada al agente  
[ ] Admin puede crear/eliminar inmuebles y agentes  
[ ] CSV importado corretamente actualiza lista de inmuebles  
[ ] Todo el sistema en español europeo  
[ ] Funciona en mobile-first (375px)  
[ ] Sem errores no console  

Fases de Implementación:
Fase 1: Estrutura base de inventario y layout  
Fase 2: CRUD de inmuebles y filtros de búsqueda  
Fase 3: Lógica de agentes y solicitudes de visitas  
Fase 4: Importación CSV y gestión avanzada de admin  
Fase 5: Polish visual, animaciones y pruebas finales

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tuhogarposible.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bf3ad1d6-fa5a-4633-8204-9688cb566f75).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
