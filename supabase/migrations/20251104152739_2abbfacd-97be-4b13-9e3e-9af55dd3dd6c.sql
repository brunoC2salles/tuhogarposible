-- Permitir leitura pública de um imóvel específico por ID para compartilhamento com leads
CREATE POLICY "Anyone can view single inmueble by id"
ON public.inmuebles
FOR SELECT
USING (true);