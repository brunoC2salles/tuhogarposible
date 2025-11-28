-- Resetar produtos falhados para tentar novamente
-- Isto vai resetar todos os produtos com status 'failed' para 'pending'
-- e zerar o contador de tentativas

UPDATE scraping_progress
SET 
  status = 'pending',
  attempts = 0,
  error_message = NULL,
  last_attempt_at = NULL,
  updated_at = now()
WHERE status = 'failed';