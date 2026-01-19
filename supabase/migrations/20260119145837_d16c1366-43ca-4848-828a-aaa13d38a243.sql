-- Inserir configuração para webhook Meta Ads → Bitrix24
INSERT INTO public.admin_settings (key, value, description)
VALUES (
  'webhook_meta_bitrix_url', 
  '', 
  'URL do webhook Make.com para enviar leads qualificados do Meta Ads ao Bitrix24'
)
ON CONFLICT (key) DO NOTHING;