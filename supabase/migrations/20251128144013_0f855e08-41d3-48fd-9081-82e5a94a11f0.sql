-- Adicionar colunas de data de vencimento e data de pagamento
ALTER TABLE public.product_invoices
ADD COLUMN payment_due_date timestamptz,
ADD COLUMN paid_at timestamptz;