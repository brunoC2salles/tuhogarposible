-- Adicionar coluna images para múltiplas fotos nos imóveis
ALTER TABLE public.inmuebles 
ADD COLUMN images jsonb;

COMMENT ON COLUMN public.inmuebles.images IS 'Array de URLs de imagens do imóvel no formato JSON: ["url1.jpg", "url2.jpg"]';