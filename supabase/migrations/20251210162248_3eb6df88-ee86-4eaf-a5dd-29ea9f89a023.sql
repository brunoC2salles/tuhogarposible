-- Add service cost tracking fields to product_invoices
ALTER TABLE public.product_invoices
ADD COLUMN IF NOT EXISTS service_costs JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS total_service_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_company NUMERIC DEFAULT 0;