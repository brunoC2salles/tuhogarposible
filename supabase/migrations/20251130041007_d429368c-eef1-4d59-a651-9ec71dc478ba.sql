-- Adicionar configuração de webhook de abandonos na tabela admin_settings
INSERT INTO admin_settings (key, value, description)
VALUES (
  'webhook_abandonos_url',
  '',
  'URL do webhook Make.com para enviar dados de leads que abandonaram o formulário'
)
ON CONFLICT (key) DO NOTHING;