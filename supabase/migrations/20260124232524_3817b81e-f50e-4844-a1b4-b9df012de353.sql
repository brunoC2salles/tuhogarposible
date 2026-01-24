-- RPC function to get distinct filter values in a single optimized query
CREATE OR REPLACE FUNCTION public.get_distinct_filter_values()
RETURNS TABLE (ciudades text[], tipos text[]) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 
    COALESCE(
      (SELECT array_agg(DISTINCT ciudad ORDER BY ciudad) FROM inmuebles WHERE disponible = true AND ciudad IS NOT NULL),
      ARRAY[]::text[]
    ) as ciudades,
    COALESCE(
      (SELECT array_agg(DISTINCT tipo ORDER BY tipo) FROM inmuebles WHERE disponible = true AND tipo IS NOT NULL),
      ARRAY[]::text[]
    ) as tipos;
END;
$$;