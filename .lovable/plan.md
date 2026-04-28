Confirmé que el PDF subido es válido: en la página 1 aparece `Periodo: 28/04/2025-28/04/2026`, con 39 páginas y movimientos distribuidos desde abril de 2025 hasta abril de 2026.

El fallo no es del documento. El problema es que la función desplegada está extrayendo del PDF prácticamente solo números de página, por eso la IA responde “documento vacío / sin texto procesable” y el sistema termina marcando `months_detected = 0`.

Plan de corrección:

1. Robustecer la extracción de texto del PDF
   - Mantener la extracción actual con `unpdf` como primer intento.
   - Añadir una segunda vía de extracción para PDFs escaneados o PDFs donde `unpdf` devuelve texto insuficiente.
   - Si el texto extraído contiene muy pocas palabras/fechas, marcarlo como extracción débil y activar fallback en vez de aceptar `0 meses`.

2. Validar cobertura por OCR/visión cuando el texto nativo falla
   - Para documentos con extracción débil, analizar al menos las páginas clave del PDF con IA multimodal/visión.
   - Extraer específicamente estos datos:
     - entidad bancaria
     - titular
     - IBAN
     - periodo declarado
     - fechas de movimientos visibles
   - Usar `Periodo: 28/04/2025-28/04/2026` como fuente principal para validar los 12 meses cuando esté presente.

3. Cambiar la regla de viabilidad para este caso
   - Si el documento tiene periodo bancario válido de 12+ meses, no mostrar al cliente “no contiene los últimos 12 meses”.
   - Si aún no se pueden calcular ingresos/deudas con confianza, mostrar un estado correcto de “documento válido, revisión manual requerida”, no “documento incompleto”.

4. Guardar diagnóstico técnico en el análisis
   - Registrar en `result`/`warnings` si se usó fallback OCR/visión.
   - Guardar `months_detected = 13`, `missing_months = []`, `incomplete_months = false` cuando el periodo declarado cubra de abril 2025 a abril 2026.

5. Reparar los análisis fallidos recientes de este mismo documento
   - Actualizar los registros recientes que quedaron con `months_detected = 0` para este PDF.
   - Dejarlos como documento válido con revisión manual, en vez de rechazo por meses incompletos.

6. Desplegar y probar
   - Desplegar `bewor-public-upload` con la nueva lógica.
   - Probar nuevamente con este PDF.
   - Verificar que el estado público ya no muestre “no contiene los últimos 12 meses completos”.

Archivos previstos:
- `supabase/functions/_shared/internalStatementAnalysis.ts`
- `supabase/functions/bewor-public-upload/index.ts`
- Posible migración SQL para corregir los análisis recientes ya creados.

Resultado esperado:
- Este documento CaixaBank será reconocido como válido para cobertura de 12 meses.
- El cliente no verá más el mensaje incorrecto de extracto incompleto.
- Cuando la extracción financiera no sea suficiente, el sistema pedirá revisión manual, pero sin invalidar el documento por meses.