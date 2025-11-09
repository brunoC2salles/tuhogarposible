-- Criar função RPC para identificar inmuebles protegidos (com reservas ativas ou vinculados a leads)
CREATE OR REPLACE FUNCTION public.get_protected_inmuebles(provider TEXT)
RETURNS TABLE(inmueble_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Inmuebles com reservas pendentes ou confirmadas
  SELECT DISTINCT r.inmueble_id
  FROM reservas r
  INNER JOIN inmuebles i ON r.inmueble_id = i.id
  WHERE i.proveedor = provider
    AND r.estado IN ('pendiente', 'confirmada')
  
  UNION
  
  -- Inmuebles vinculados a leads
  SELECT DISTINCT li.inmueble_id
  FROM lead_inmuebles li
  INNER JOIN inmuebles i ON li.inmueble_id = i.id
  WHERE i.proveedor = provider
$$;