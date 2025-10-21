-- Fix: Adicionar search_path à função create_lead_from_qualified_submission

CREATE OR REPLACE FUNCTION create_lead_from_qualified_submission()
RETURNS TRIGGER AS $$
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
      valor_inmueble_deseado,
      agente_asignado_id,
      stage,
      source,
      notas
    ) VALUES (
      NEW.nombre_completo,
      NEW.email,
      NEW.telefono,
      NEW.ciudad_interes,
      NEW.valor_inmueble_deseado,
      NEW.agente_asignado_id,
      'primera_llamada'::lead_stage,
      'formulario_web'::lead_source,
      'Lead creado automáticamente desde formulario de cualificación. Comunidad: ' || COALESCE(NEW.comunidad_autonoma, 'No especificada')
    )
    RETURNING id INTO NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;