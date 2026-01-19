-- Adicionar coluna disponibilidad na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS disponibilidad text[] DEFAULT ARRAY['mañana', 'tarde', 'noche'];

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.disponibilidad IS 'Array de turnos disponíveis do agente: mañana (08:00-14:00), tarde (14:00-20:00), noche (20:00-08:00)';