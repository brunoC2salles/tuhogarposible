Voy a corregir el analizador interno de extractos para que reconozca correctamente documentos como el PDF de CaixaBank que subiste.

Confirmación del caso:
- El PDF sí contiene 12 meses: periodo 28/04/2025-28/04/2026.
- Tiene 39 páginas y movimientos desde 28/04/2025 hasta 28/04/2026.
- El fallo ocurrió porque el flujo actual depende demasiado de la extracción textual/IA; en este archivo la IA devolvió 0 meses aunque el periodo está claramente en el documento.

Plan de implementación:

1. Añadir detección determinística del periodo del extracto
- En `supabase/functions/_shared/internalStatementAnalysis.ts`, crearé lógica que lea el texto extraído antes de llamar a la IA.
- Detectará encabezados como:
  - `Periodo: 28/04/2025-28/04/2026`
  - `Periodo 28/04/2025 - 28/04/2026`
  - formatos similares con `/` o `-`.
- A partir de ese periodo generará los meses cubiertos, por ejemplo:
  - 2025-04, 2025-05, ..., 2026-04.

2. Usar el periodo del banco como respaldo obligatorio
- Si la IA devuelve menos de 12 meses, pero el periodo declarado del banco cubre 12 meses o más, el sistema usará ese periodo como fuente confiable.
- En ese caso, la viabilidad ya no marcará `incomplete_months: true` solo por fallo de extracción de meses.
- Se añadirá un aviso interno indicando que los meses fueron corregidos desde el periodo declarado del extracto.

3. Mejorar la extracción por fechas de movimientos
- Además del encabezado `Periodo`, extraeré fechas de movimientos (`dd/mm/yyyy`) del texto.
- Si se encuentran movimientos distribuidos en 12 meses, también se considerará suficiente aunque la IA haya omitido meses.
- Esto cubre bancos que no imprimen un campo `Periodo` claro.

4. Reducir falsos negativos por compresión del texto
- Revisaré `compactStatementText` para que siempre preserve el encabezado inicial del PDF, donde CaixaBank incluye el periodo.
- El prompt de IA seguirá existiendo, pero la validación de “12 meses” no dependerá exclusivamente de la respuesta de la IA.

5. Reparar el análisis ya creado para este PDF
- Actualizaré el registro reciente `1c8988a3-c8da-400a-9fec-b8a5b8447dde` para reflejar:
  - `months_detected = 13` o al menos 12, según el cálculo inclusivo del periodo.
  - `missing_months = []`.
  - `incomplete_months = false`.
  - Mantener `manual_review_required = true` si los datos financieros quedaron con baja confianza, porque la IA no extrajo bien ingresos/deudas/ahorros.
- Importante: corregiré el error de “no tiene 12 meses”, pero no inventaré ingresos/deudas/ahorros si la extracción financiera no fue confiable. Si hace falta, el documento quedará habilitado para revisión manual con el periodo validado.

6. Validación
- Probaré la lógica con este caso concreto:
  - Periodo detectado: 28/04/2025 a 28/04/2026.
  - Resultado esperado: 12 meses completos aceptados.
- Revisaré que el estado público/admin ya no muestre el rechazo por falta de 12 meses para este análisis.

Resultado esperado:
- Nuevos extractos con un periodo bancario válido de 12 meses no serán rechazados por error.
- Este PDF de CaixaBank quedará corregido para no decir que faltan meses.
- La parte financiera seguirá marcada para revisión si la IA no pudo extraer importes con confianza, pero el motivo ya no será “faltan 12 meses”.