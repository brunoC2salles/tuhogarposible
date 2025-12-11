-- Add description and IVA flag for direct invoicing
ALTER TABLE product_invoices 
ADD COLUMN IF NOT EXISTS descripcion_directa TEXT,
ADD COLUMN IF NOT EXISTS aplicar_iva BOOLEAN DEFAULT true;