-- Add comision_porcentaje field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN comision_porcentaje NUMERIC(5,2) DEFAULT 0 NOT NULL;

-- Add check constraint to ensure percentage is between 0 and 100
ALTER TABLE public.profiles 
ADD CONSTRAINT comision_porcentaje_range CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100);

COMMENT ON COLUMN public.profiles.comision_porcentaje IS 'Porcentaje de comisión del agente sobre el total de facturas (0-100)';