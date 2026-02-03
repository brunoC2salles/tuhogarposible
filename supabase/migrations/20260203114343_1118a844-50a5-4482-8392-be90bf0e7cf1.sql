-- Habilitar RLS na tabela de backup e atualizar função get_agent_statistics
-- para usar os novos estágios

-- RLS na tabela de backup
ALTER TABLE _leads_stage_migration_backup ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver o backup
CREATE POLICY "Solo admins ven backup" ON _leads_stage_migration_backup
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Atualizar função get_agent_statistics para usar 'subida_expediente_bancos' como convertido
CREATE OR REPLACE FUNCTION public.get_agent_statistics(agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  total_leads int;
  converted_leads int;
  stage_counts jsonb;
BEGIN
  SELECT COUNT(*) INTO total_leads
  FROM leads
  WHERE agente_asignado_id = agent_id;
  
  -- Considera 'subida_expediente_bancos' como leads convertidos
  SELECT COUNT(*) INTO converted_leads
  FROM leads
  WHERE agente_asignado_id = agent_id
    AND stage = 'subida_expediente_bancos';
  
  SELECT jsonb_object_agg(stage, count)
  INTO stage_counts
  FROM (
    SELECT stage::text, COUNT(*) as count
    FROM leads
    WHERE agente_asignado_id = agent_id
    GROUP BY stage
  ) stage_data;
  
  result := jsonb_build_object(
    'total_leads', total_leads,
    'converted_leads', converted_leads,
    'conversion_rate', CASE 
      WHEN total_leads > 0 THEN ROUND((converted_leads::numeric / total_leads::numeric) * 100, 2)
      ELSE 0
    END,
    'stage_counts', COALESCE(stage_counts, '{}'::jsonb)
  );
  
  RETURN result;
END;
$function$;