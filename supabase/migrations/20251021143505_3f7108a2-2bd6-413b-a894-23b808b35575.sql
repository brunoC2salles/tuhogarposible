-- Migration 2: Atualizar perfis existentes com dados Tidycal

-- Agentes Cataluña
UPDATE profiles SET 
  tidycal_url = 'https://tidycal.com/dsanabria/30-minute-meeting',
  region_round_robin = 'Cataluña'
WHERE email = 'dsanabria@tuhogarposible.com';

UPDATE profiles SET 
  nombre = 'Albert Cols',
  tidycal_url = 'https://tidycal.com/acols1/30-minute-meeting',
  region_round_robin = 'Cataluña'
WHERE email = 'acols@tuhogarposible.com';

UPDATE profiles SET 
  tidycal_url = 'https://tidycal.com/jfernandez2/30-minute-meeting',
  region_round_robin = 'Cataluña'
WHERE email = 'jfernandez@tuhogarposible.com';

-- Agentes Geral
UPDATE profiles SET 
  tidycal_url = 'https://tidycal.com/pgimeno/30-minute-meeting',
  region_round_robin = 'Geral'
WHERE email = 'pgimeno@tuhogarposible.com';

UPDATE profiles SET 
  tidycal_url = 'https://tidycal.com/jantonio/30-minute-meeting',
  region_round_robin = 'Geral'
WHERE email = 'jantonio@tuhogarposible.com';

UPDATE profiles SET 
  tidycal_url = 'https://tidycal.com/tsavulov/30-minute-meeting',
  region_round_robin = 'Geral'
WHERE email = 'tsavulov@tuhogarposible.com';