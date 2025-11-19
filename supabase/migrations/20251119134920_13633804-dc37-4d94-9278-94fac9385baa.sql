-- Passo 1: Remover constraint antigo e criar temporário permitindo ambos
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_region_round_robin_check;

-- Permitir temporariamente ambos valores durante migração
ALTER TABLE profiles
ADD CONSTRAINT profiles_region_round_robin_check 
CHECK (region_round_robin IS NULL OR region_round_robin IN ('Cataluña', 'Geral', 'General'));

-- Passo 2: Atualizar dados de "Geral" → "General"
UPDATE profiles 
SET region_round_robin = 'General' 
WHERE region_round_robin = 'Geral';

-- Atualizar agent_assignment_tracking também
UPDATE agent_assignment_tracking
SET region = 'General'
WHERE region = 'Geral';

-- Passo 3: Aplicar constraint final apenas com valores corretos
ALTER TABLE profiles 
DROP CONSTRAINT profiles_region_round_robin_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_region_round_robin_check 
CHECK (region_round_robin IS NULL OR region_round_robin IN ('Cataluña', 'General'));