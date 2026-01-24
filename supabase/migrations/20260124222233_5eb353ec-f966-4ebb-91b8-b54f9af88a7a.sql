-- =============================================
-- FASE 4: Limpeza Completa do Banco de Dados (Corrigido)
-- Features removidas: Chat, Formulários, Contratos, Abandonos
-- =============================================

-- 1. REMOVER TRIGGERS (nomes corretos)
DROP TRIGGER IF EXISTS on_form_abandoned ON form_partial_submissions;
DROP TRIGGER IF EXISTS on_qualified_submission ON form_submissions;
DROP TRIGGER IF EXISTS on_chat_message ON chat_messages;
DROP TRIGGER IF EXISTS on_new_lead_from_form ON form_submissions;

-- 2. REMOVER FUNCTIONS COM CASCADE
DROP FUNCTION IF EXISTS notify_form_abandonment() CASCADE;
DROP FUNCTION IF EXISTS create_lead_from_qualified_submission() CASCADE;
DROP FUNCTION IF EXISTS notify_chat_message() CASCADE;
DROP FUNCTION IF EXISTS notify_new_lead_from_form() CASCADE;

-- 3. REMOVER FOREIGN KEYS E COLUNAS ÓRFÃS
ALTER TABLE webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_submission_id_fkey;
ALTER TABLE webhook_logs DROP COLUMN IF EXISTS submission_id;

-- 4. REMOVER TABELAS DE CONTRATOS (ordem: links -> contracts -> templates)
DROP TABLE IF EXISTS public_contract_links CASCADE;
DROP TABLE IF EXISTS generated_contracts CASCADE;
DROP TABLE IF EXISTS contract_templates CASCADE;

-- 5. REMOVER TABELAS DE CHAT (ordem: messages -> members -> channels)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_channel_members CASCADE;
DROP TABLE IF EXISTS chat_channels CASCADE;

-- 6. REMOVER TABELAS DE FORMULÁRIOS
DROP TABLE IF EXISTS form_partial_submissions CASCADE;
DROP TABLE IF EXISTS form_submissions CASCADE;