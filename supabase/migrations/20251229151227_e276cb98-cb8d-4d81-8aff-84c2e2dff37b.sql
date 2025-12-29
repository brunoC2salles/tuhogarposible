-- Migrar todos os leads com stages antigos para os novos stages
UPDATE leads SET stage = 'recopilacion_expediente' WHERE stage IN ('preparacion_expediente', 'pretasacion', 'lead_cualificado', 'mensaje_whatsapp', 'primera_llamada', 'reunion_contrato', 'firma_pago', 'listo');

-- Migrar stage cobrar para cobro
UPDATE leads SET stage = 'cobro' WHERE stage = 'cobrar';

-- Atualizar a função create_lead_from_qualified_submission para usar o novo stage
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
      'recopilacion_expediente'::lead_stage,
      'formulario_web'::lead_source,
      'Lead creado automáticamente desde formulario de cualificación. Comunidad: ' || 
      COALESCE(NEW.comunidad_autonoma, 'No especificada')
    )
    RETURNING id INTO NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Atualizar o default do campo stage na tabela leads
ALTER TABLE leads ALTER COLUMN stage SET DEFAULT 'recopilacion_expediente'::lead_stage;

-- Atualizar históricos antigos também
UPDATE lead_historico SET stage_nuevo = 'recopilacion_expediente' WHERE stage_nuevo IN ('preparacion_expediente', 'pretasacion', 'lead_cualificado', 'mensaje_whatsapp', 'primera_llamada', 'reunion_contrato', 'firma_pago', 'listo');
UPDATE lead_historico SET stage_anterior = 'recopilacion_expediente' WHERE stage_anterior IN ('preparacion_expediente', 'pretasacion', 'lead_cualificado', 'mensaje_whatsapp', 'primera_llamada', 'reunion_contrato', 'firma_pago', 'listo');
UPDATE lead_historico SET stage_nuevo = 'cobro' WHERE stage_nuevo = 'cobrar';
UPDATE lead_historico SET stage_anterior = 'cobro' WHERE stage_anterior = 'cobrar';