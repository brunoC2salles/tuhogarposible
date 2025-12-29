-- Atualizar a função de estatísticas para usar o novo stage de conversão
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
  -- Total de leads do agente
  SELECT COUNT(*) INTO total_leads
  FROM leads
  WHERE agente_asignado_id = agent_id;
  
  -- Leads convertidos (stage = 'finalizada')
  SELECT COUNT(*) INTO converted_leads
  FROM leads
  WHERE agente_asignado_id = agent_id
    AND stage = 'finalizada';
  
  -- Contagem por estágio
  SELECT jsonb_object_agg(stage, count)
  INTO stage_counts
  FROM (
    SELECT stage::text, COUNT(*) as count
    FROM leads
    WHERE agente_asignado_id = agent_id
    GROUP BY stage
  ) stage_data;
  
  -- Montar resultado
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