-- Migration 4: Criar tabela de tracking e trigger para auto-criar leads

-- 4.1 Criar tabela agent_assignment_tracking
CREATE TABLE IF NOT EXISTS agent_assignment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL UNIQUE,
  last_assigned_agent_id UUID REFERENCES profiles(id),
  last_assignment_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir registros iniciais
INSERT INTO agent_assignment_tracking (region) 
VALUES ('Cataluña'), ('Geral')
ON CONFLICT (region) DO NOTHING;

-- RLS: apenas service role pode modificar
ALTER TABLE agent_assignment_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage tracking"
ON agent_assignment_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_agent_assignment_tracking_updated_at
BEFORE UPDATE ON agent_assignment_tracking
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4.2 Função para criar lead automaticamente quando form_submission é qualificado
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: executar ANTES de INSERT
CREATE TRIGGER trigger_create_lead_from_submission
BEFORE INSERT ON form_submissions
FOR EACH ROW
EXECUTE FUNCTION create_lead_from_qualified_submission();