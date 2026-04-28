Implementaré tres cambios conectados: corregir el lead afectado, endurecer la interpretación de ahorros en Meta Ads, y reemplazar el inventario actual por el JSON de Idealista adjunto.

Plan de implementación

1. Corregir el lead “6 mil por ahora”
- Actualizar el lead encontrado:
  - id: `1aa6c990-73cb-4b08-aebf-26c0e987e246`
  - nombre: Alvaro De La Roja
- Cambiar `stage` de `descualificados` a `nuevo_lead`.
- Mantenerlo como lead aprobado/cualificado a nivel de simulación, ya que `simulador_hipotecario_data.aprobado` ya está en `true`.
- Actualizar los datos hipotecarios para que `meta_monto_ahorros` pase de `6` a `6000`, preservando el texto original `meta_tiene_ahorros = "6 mil por ahora"`.
- Ajustar la nota automática para que deje de indicar “NO CUALIFICADO - Ahorros insuficientes” y refleje que fue corregido/cualificado por interpretación de ahorros.

2. Cambiar regla de ahorros para nuevos leads de Meta Ads
- Actualizar `supabase/functions/meta-lead-webhook/index.ts`, en `parseAhorros`, para que respuestas numéricas entre 5 y 100 se interpreten como miles de euros:
  - `5` -> `5000`
  - `6` -> `6000`
  - `7` -> `7000`
  - ...
  - `100` -> `100000`
- Mantener los formatos ya soportados:
  - `5k`, `7K`, `10 mil`, `6 mil por ahora`, `5.000`, `10.000`, etc.
- Aplicar la interpretación tanto cuando el número venga en `monto_ahorros` como cuando el texto venga en `tiene_ahorros_impuestos`, para evitar casos como el de “6 mil por ahora”.
- Actualizar la memoria/regla del proyecto para que futuras sesiones respeten esta regla.

3. Adaptar el frontend para JSON de Idealista
- Modificar el importador JSON del inventario en `AdminInventario.tsx` para aceptar directamente el formato del archivo adjunto, que es un array en la raíz, no `{ items: [...] }`.
- Mapear campos de Idealista al schema actual:
  - `id` -> `codigo_inventario`
  - `titulo` -> `titulo`
  - `precio_eur` o `precio` -> `precio`
  - `url` -> `url_externa`
  - `imagenes` -> `images` y primera imagen válida -> `image_url`
  - `ubicacion` / `detalle.ubicacion` -> `ciudad`, `region`, `direccion`
  - `propiedades.habitaciones` -> `quartos`
  - `propiedades.banos` -> `banheiros`
  - `propiedades.superficie_m2` -> `area_m2`
  - `descripcion`, `detalles`, `detalle` -> metadatos adicionales si añadimos columna JSONB
- Filtrar imágenes decorativas de Idealista (`st3.idealista.com/static/common/icons`, `px.png`, certificados genéricos) para guardar principalmente fotos reales del inmueble.
- Definir `proveedor = 'Idealista'` para todos los productos importados.

4. Adaptar backend/schema si hace falta
- Añadir una columna JSONB opcional a `inmuebles`, por ejemplo `metadata`, para guardar detalles no estructurados de Idealista sin perder información:
  - descripción
  - anunciante
  - teléfono del anunciante si existe
  - detalles/características/equipamiento
  - ubicación original
- No cambiaré el enum de tipos salvo que sea necesario: Idealista se puede mapear bien a los tipos existentes (`apartamento`, `casa`, `local_comercial`, `terreno`, `oficina`).
- Mantener la clave única existente `(codigo_inventario, proveedor)` para UPSERT.

5. Reemplazar inventario antiguo por Idealista
- Importar el JSON adjunto al inventario como proveedor `Idealista`.
- Eliminar del inventario visible los productos antiguos de `Solvia` y `Hipoges`.
- Como hay 2 productos antiguos vinculados a reservas o leads, haré una limpieza segura:
  - productos sin vínculos: eliminar/desactivar completamente;
  - productos vinculados: desactivar (`disponible = false`) para no romper referencias históricas.
- A partir de la importación, el frontend listará solo productos disponibles de Idealista.

6. Validaciones
- Verificar conteos antes/después:
  - total anterior por proveedor;
  - total Idealista importado;
  - antiguos eliminados/desactivados;
  - cantidad final disponible.
- Verificar una muestra de inmuebles importados con imágenes, precio, ciudad, habitaciones, m² y URL externa.
- Verificar que el lead corregido quedó en `nuevo_lead` y ya no aparece como descualificado por ahorros.
- Verificar que el parser devuelve valores correctos para ejemplos: `5`, `6`, `10`, `100`, `101`, `4`, `5k`, `6 mil por ahora`, `5.000`.

Detalles técnicos

- Archivos previstos:
  - `supabase/functions/meta-lead-webhook/index.ts`
  - `src/pages/inventario/AdminInventario.tsx`
  - `src/hooks/useInmuebles.ts`
  - `src/types/inventario.ts`
  - posibles componentes de visualización si se muestra metadata adicional
  - memoria del proyecto sobre reglas Meta Ads
- Base de datos:
  - migración para `inmuebles.metadata jsonb default '{}'::jsonb` si confirmo que aporta valor para Idealista;
  - operaciones de datos para actualizar el lead e importar/reemplazar inventario.
- El reemplazo será irreversible en términos prácticos para el inventario visible; preservaré únicamente referencias históricas vinculadas para no romper leads/reservas existentes.