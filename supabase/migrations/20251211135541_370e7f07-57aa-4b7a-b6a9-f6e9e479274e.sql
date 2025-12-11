-- Atualizar função que cria leads a partir do formulário para usar o novo stage inicial
CREATE OR REPLACE FUNCTION public.create_lead_from_qualified_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se qualificado E tem agente designado E ainda não criou lead
  IF NEW.qualificado = true 
     AND NEW.agente_asignado_id IS NOT NULL 
     AND NEW.lead_id IS NULL THEN
    
    INSERT INTO leads (
      nombre_completo,
      email,
      telefono,
      ciudad_interes,
      zona_interes,
      valor_inmueble_deseado,
      simulador_personal_data,
      simulador_hipotecario_data,
      agente_asignado_id,
      stage,
      source,
      notas
    ) VALUES (
      NEW.nombre_completo,
      NEW.email,
      NEW.telefono,
      NEW.ciudad_interes,
      NEW.zona_interes,
      NEW.valor_inmueble_deseado,
      NEW.simulador_personal_data,
      NEW.simulador_hipotecario_data,
      NEW.agente_asignado_id,
      'preparacion_expediente'::lead_stage,
      'formulario_web'::lead_source,
      'Lead creado automáticamente desde formulario de cualificación. Comunidad: ' || 
      COALESCE(NEW.comunidad_autonoma, 'No especificada')
    )
    RETURNING id INTO NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$function$;