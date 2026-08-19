ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS estrellas smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS assignment_credit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_estrellas_range'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_estrellas_range CHECK (estrellas BETWEEN 1 AND 5);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_estrellas_change_by_non_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estrellas IS DISTINCT FROM OLD.estrellas
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    NEW.estrellas := OLD.estrellas;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_estrellas_change_trg ON public.profiles;
CREATE TRIGGER prevent_estrellas_change_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_estrellas_change_by_non_admin();