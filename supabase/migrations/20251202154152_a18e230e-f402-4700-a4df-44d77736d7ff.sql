-- FASE 1: Remover duplicados (manter o mais recente por created_at)
-- Primeiro, identificar e deletar scraping_progress de duplicados
DELETE FROM scraping_progress 
WHERE inmueble_id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY codigo_inventario, proveedor 
        ORDER BY created_at DESC
      ) as rn
    FROM inmuebles
    WHERE codigo_inventario IS NOT NULL
  ) duplicates
  WHERE rn > 1
);

-- Deletar os inmuebles duplicados
DELETE FROM inmuebles 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY codigo_inventario, proveedor 
        ORDER BY created_at DESC
      ) as rn
    FROM inmuebles
    WHERE codigo_inventario IS NOT NULL
  ) duplicates
  WHERE rn > 1
);

-- FASE 2: Criar índice único para prevenir futuros duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_inmuebles_codigo_proveedor_unique 
ON inmuebles (codigo_inventario, proveedor) 
WHERE codigo_inventario IS NOT NULL;