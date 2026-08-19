---
name: Editar in-situ, sin cambiar de página
description: El admin quiere poder resolver acciones simples (ej. estrellas de agente) en la misma página donde ve los datos, no navegando a otra pantalla
type: preference
---
Cuando una acción simple (cambiar estrellas, activar/desactivar, reasignar, etc.) se relaciona con datos que ya se muestran en una tabla o panel, hazla editable **in-situ** en esa misma vista. **Por qué:** evitar cambiar de página para resolver algo trivial. **Cómo aplicar:** controles inline con guardado optimista + toast, sin quitar necesariamente el editor original en su página nativa.

Ejemplo aplicado: `AgentAssignmentTable` en `/admin/asignaciones` permite editar `profiles.estrellas` directamente.
