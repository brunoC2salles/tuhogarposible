-- Marcar todos os produtos Hipoges como "completed" no scraping
-- (não precisam scraping pois imagens vêm do JSON)
UPDATE scraping_progress sp
SET 
  status = 'completed',
  error_message = 'Hipoges - imagens do JSON',
  images_found = COALESCE(
    (SELECT jsonb_array_length(i.images) FROM inmuebles i WHERE i.id = sp.inmueble_id),
    1
  )
FROM inmuebles i
WHERE sp.inmueble_id = i.id 
  AND i.proveedor = 'Hipoges'
  AND sp.status IN ('pending', 'failed', 'processing');

-- Marcar produtos Solvia com imagens existentes como "completed"
UPDATE scraping_progress sp
SET 
  status = 'completed',
  error_message = NULL,
  images_found = (SELECT jsonb_array_length(i.images) FROM inmuebles i WHERE i.id = sp.inmueble_id)
FROM inmuebles i
WHERE sp.inmueble_id = i.id 
  AND i.proveedor = 'Solvia'
  AND i.images IS NOT NULL 
  AND jsonb_array_length(i.images) > 0
  AND sp.status IN ('pending', 'failed', 'processing');

-- Marcar produtos "failed" com muitas tentativas como definitivamente failed
-- (evitar loop infinito)
UPDATE scraping_progress
SET status = 'failed'
WHERE status = 'pending' AND attempts >= 3;