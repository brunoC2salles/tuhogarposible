-- Remove all Clickalia products and related scraping progress records

-- 1. Delete scraping_progress records linked to Clickalia products (FK constraint)
DELETE FROM scraping_progress 
WHERE inmueble_id IN (
  SELECT id FROM inmuebles WHERE proveedor = 'Clikalia'
);

-- 2. Delete Clickalia products from inmuebles
DELETE FROM inmuebles WHERE proveedor = 'Clikalia';