-- Tabela para rastrear progresso de scraping
CREATE TABLE IF NOT EXISTS public.scraping_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inmueble_id uuid REFERENCES public.inmuebles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer DEFAULT 0,
  last_attempt_at timestamp with time zone,
  error_message text,
  images_found integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(inmueble_id)
);

-- Índices para performance
CREATE INDEX idx_scraping_status ON public.scraping_progress(status);
CREATE INDEX idx_scraping_inmueble ON public.scraping_progress(inmueble_id);
CREATE INDEX idx_scraping_attempts ON public.scraping_progress(attempts) WHERE status = 'failed';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_scraping_progress_updated_at 
  BEFORE UPDATE ON public.scraping_progress
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Popular com produtos pendentes (apenas Solvia com 1 imagem)
INSERT INTO public.scraping_progress (inmueble_id, status)
SELECT id, 'pending'
FROM public.inmuebles
WHERE proveedor = 'Solvia'
  AND url_externa IS NOT NULL
  AND images IS NOT NULL
  AND jsonb_array_length(images) = 1
ON CONFLICT (inmueble_id) DO NOTHING;

-- RLS Policies (admin pode ver)
ALTER TABLE public.scraping_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view scraping progress"
  ON public.scraping_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );