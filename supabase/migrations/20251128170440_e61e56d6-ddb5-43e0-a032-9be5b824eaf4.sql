-- Remover produtos Clikalia do inventário

-- Passo 1: Remover scraping_progress dos produtos Clikalia
DELETE FROM scraping_progress 
WHERE inmueble_id IN (
  SELECT id FROM inmuebles WHERE proveedor = 'Clikalia'
);

-- Passo 2: Remover produtos Clikalia
DELETE FROM inmuebles WHERE proveedor = 'Clikalia';