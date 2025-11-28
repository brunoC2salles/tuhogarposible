-- FASE 1: Popular registros faltantes
-- Inserir registros em scraping_progress para todos os inmuebles que ainda não têm
INSERT INTO scraping_progress (inmueble_id, status, attempts, created_at, updated_at)
SELECT 
  i.id,
  'pending',
  0,
  now(),
  now()
FROM inmuebles i
LEFT JOIN scraping_progress sp ON i.id = sp.inmueble_id
WHERE sp.id IS NULL 
  AND i.url_externa IS NOT NULL
  AND i.url_externa != '';

-- FASE 2: Criar trigger automático para novos inmuebles
-- A função auto_insert_scraping_queue() já existe, apenas criar o trigger
CREATE TRIGGER trigger_auto_insert_scraping_queue
  AFTER INSERT ON inmuebles
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_scraping_queue();

-- Comentário explicativo
COMMENT ON TRIGGER trigger_auto_insert_scraping_queue ON inmuebles IS 
  'Automaticamente cria registro em scraping_progress quando um novo inmueble com url_externa é inserido';