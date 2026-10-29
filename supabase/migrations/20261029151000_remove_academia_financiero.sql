-- 2026-10-29: se eliminan Academia y Control Financiero de la plataforma.
-- Las facturas ya emitidas (product_invoices y el bucket "invoices") se conservan.

-- Aviso diario de vencimiento de facturas (Control Financiero)
SELECT cron.unschedule('check-invoice-deadlines-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-invoice-deadlines-daily');

-- Control Financiero (tablas vacías)
DROP TABLE IF EXISTS public.agent_variable_costs;
DROP TABLE IF EXISTS public.faturacoes;
DROP TABLE IF EXISTS public.despesas_operacionais;

-- Academia de agentes
DROP TABLE IF EXISTS public.training_videos;
DROP TABLE IF EXISTS public.document_templates;
