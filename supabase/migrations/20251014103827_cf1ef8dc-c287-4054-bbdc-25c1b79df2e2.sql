-- Índices para tabela inmuebles (mais consultada)
CREATE INDEX IF NOT EXISTS idx_inmuebles_disponible 
ON public.inmuebles (disponible) 
WHERE disponible = true;

CREATE INDEX IF NOT EXISTS idx_inmuebles_ciudad 
ON public.inmuebles (ciudad);

CREATE INDEX IF NOT EXISTS idx_inmuebles_tipo 
ON public.inmuebles (tipo);

CREATE INDEX IF NOT EXISTS idx_inmuebles_created_at 
ON public.inmuebles (created_at DESC);

-- Índice composto para query comum: disponible + ciudad
CREATE INDEX IF NOT EXISTS idx_inmuebles_disponible_ciudad 
ON public.inmuebles (disponible, ciudad) 
WHERE disponible = true;

-- Índices para tabela reservas
CREATE INDEX IF NOT EXISTS idx_reservas_inmueble_id 
ON public.reservas (inmueble_id);

CREATE INDEX IF NOT EXISTS idx_reservas_estado 
ON public.reservas (estado);

CREATE INDEX IF NOT EXISTS idx_reservas_fecha_visita 
ON public.reservas (fecha_visita) 
WHERE fecha_visita IS NOT NULL;

-- Índice composto para query de visitas ativas
CREATE INDEX IF NOT EXISTS idx_reservas_inmueble_estado 
ON public.reservas (inmueble_id, estado) 
WHERE estado IN ('pendiente', 'confirmada');

-- Comentários para documentação
COMMENT ON INDEX idx_inmuebles_disponible IS 'Optimiza filtros de agentes (solo disponibles)';
COMMENT ON INDEX idx_reservas_inmueble_estado IS 'Optimiza conteo de visitas por inmueble';