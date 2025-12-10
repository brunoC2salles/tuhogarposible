-- FASE 2: Remover completamente o sistema de Reclutamiento de Agentes

-- 1. DROP trigger primeiro (depende da função e tabela)
DROP TRIGGER IF EXISTS trigger_notify_candidate_stage_change ON agent_candidates;
DROP TRIGGER IF EXISTS trigger_update_candidate_stage_change ON agent_candidates;
DROP TRIGGER IF EXISTS trigger_update_agent_candidate_updated_at ON agent_candidates;

-- 2. DROP tabelas (ordem correta para respeitar foreign keys)
DROP TABLE IF EXISTS agent_candidate_documents CASCADE;
DROP TABLE IF EXISTS agent_candidates CASCADE;

-- 3. DROP funções relacionadas
DROP FUNCTION IF EXISTS notify_candidate_stage_change();
DROP FUNCTION IF EXISTS update_agent_candidate_updated_at();
DROP FUNCTION IF EXISTS update_candidate_stage_change();

-- 4. DROP enum de stages
DROP TYPE IF EXISTS agent_candidate_stage;