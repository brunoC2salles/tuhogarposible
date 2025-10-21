-- Migration 1: Adicionar colunas para Tidycal e região em profiles

-- Adicionar colunas
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tidycal_url TEXT,
ADD COLUMN IF NOT EXISTS region_round_robin TEXT CHECK (region_round_robin IN ('Cataluña', 'Geral'));

-- Comentários para documentação
COMMENT ON COLUMN profiles.tidycal_url IS 'URL do calendário Tidycal do agente (ex: https://tidycal.com/agente/30-minute-meeting)';
COMMENT ON COLUMN profiles.region_round_robin IS 'Região para distribuição de leads: Cataluña ou Geral (outras 16 comunidades)';