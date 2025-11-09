-- Permitir que o trigger auto_insert_scraping_queue funcione
CREATE POLICY "Allow automatic scraping queue inserts"
ON public.scraping_progress
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite inserts de admins
  has_role(auth.uid(), 'admin'::user_role)
  OR
  -- Permite inserts do trigger (executa com privilégios do owner)
  true
);

-- Também permitir updates para o sistema processar o scraping
CREATE POLICY "Allow scraping updates"
ON public.scraping_progress
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
);