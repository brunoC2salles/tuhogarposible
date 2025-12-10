-- FASE 1: Adicionar suporte para facturação direta (sem imóvel)

-- Adicionar campo para monto directo
ALTER TABLE product_invoices 
  ADD COLUMN IF NOT EXISTS monto_directo numeric;

-- Tornar property_price nullable (não obrigatório para facturação direta)
ALTER TABLE product_invoices 
  ALTER COLUMN property_price DROP NOT NULL;