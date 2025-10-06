-- Adicionar novos campos à tabela inmuebles para suportar dados do JSON
ALTER TABLE public.inmuebles 
ADD COLUMN IF NOT EXISTS titulo TEXT,
ADD COLUMN IF NOT EXISTS quartos INTEGER,
ADD COLUMN IF NOT EXISTS banheiros INTEGER,
ADD COLUMN IF NOT EXISTS area_m2 NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS url_externa TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Criar índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_inmuebles_quartos ON public.inmuebles(quartos);
CREATE INDEX IF NOT EXISTS idx_inmuebles_area ON public.inmuebles(area_m2);
CREATE INDEX IF NOT EXISTS idx_inmuebles_image ON public.inmuebles(image_url) WHERE image_url IS NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.inmuebles.titulo IS 'Título descritivo do imóvel';
COMMENT ON COLUMN public.inmuebles.quartos IS 'Número de quartos';
COMMENT ON COLUMN public.inmuebles.banheiros IS 'Número de banheiros';
COMMENT ON COLUMN public.inmuebles.area_m2 IS 'Área em metros quadrados';
COMMENT ON COLUMN public.inmuebles.url_externa IS 'URL externa da listagem original';
COMMENT ON COLUMN public.inmuebles.image_url IS 'URL da imagem principal do imóvel';