-- ============================================
-- TRIGGER AUTOMÁTICO DE SCRAPING
-- ============================================

-- Função que insere na fila de scraping
CREATE OR REPLACE FUNCTION auto_insert_scraping_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Só adiciona se tiver url_externa
  IF NEW.url_externa IS NOT NULL AND NEW.url_externa != '' THEN
    INSERT INTO scraping_progress (inmueble_id, status, attempts)
    VALUES (NEW.id, 'pending', 0)
    ON CONFLICT (inmueble_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que dispara ao inserir novo imóvel
CREATE TRIGGER trigger_auto_scraping
  AFTER INSERT ON public.inmuebles
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_scraping_queue();

-- ============================================
-- PROCESSAR BACKLOG EXISTENTE (apenas desta vez)
-- ============================================
INSERT INTO scraping_progress (inmueble_id, status, attempts)
SELECT id, 'pending', 0
FROM inmuebles
WHERE url_externa IS NOT NULL 
  AND url_externa != ''
  AND id NOT IN (SELECT inmueble_id FROM scraping_progress WHERE inmueble_id IS NOT NULL)
ON CONFLICT (inmueble_id) DO NOTHING;