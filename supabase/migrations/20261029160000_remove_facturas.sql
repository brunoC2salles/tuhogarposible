-- 2026-10-29: Control Financiero eliminado por completo (facturas incluidas).
DROP TABLE IF EXISTS public.product_invoices;
DROP FUNCTION IF EXISTS public.get_next_invoice_number();
