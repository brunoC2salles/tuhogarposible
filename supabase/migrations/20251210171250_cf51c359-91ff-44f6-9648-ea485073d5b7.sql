-- Drop the conditional unique index that's causing UPSERT to fail
DROP INDEX IF EXISTS idx_inmuebles_codigo_proveedor_unique;

-- Create new unconditional unique index
CREATE UNIQUE INDEX idx_inmuebles_codigo_proveedor_unique 
ON public.inmuebles (codigo_inventario, proveedor);