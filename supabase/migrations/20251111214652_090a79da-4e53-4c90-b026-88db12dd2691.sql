-- FASE 1: Correções Urgentes

-- 1.1 Adicionar política para admins poderem deletar profiles
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- 1.2 Remover contrato_alquiler dos document_templates
-- Atualizar documentos existentes do tipo 'contrato_alquiler' para 'documento_general'
UPDATE document_templates 
SET tipo = 'documento_general' 
WHERE tipo = 'contrato_alquiler';

-- FASE 2: Sistema de Contratos Públicos

-- Criar tabela de templates de contrato customizáveis
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  campos_formulario JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_content TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de links públicos para contratos
CREATE TABLE IF NOT EXISTS public_contract_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES contract_templates(id) ON DELETE CASCADE NOT NULL,
  agente_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  datos_completados JSONB,
  contract_generated_id UUID REFERENCES generated_contracts(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_public_contract_links_token ON public_contract_links(token);
CREATE INDEX idx_public_contract_links_lead ON public_contract_links(lead_id);
CREATE INDEX idx_public_contract_links_status ON public_contract_links(status);

-- RLS para contract_templates
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contract templates"
ON contract_templates FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active templates"
ON contract_templates FOR SELECT
TO authenticated
USING (activo = true OR has_role(auth.uid(), 'admin'));

-- RLS para public_contract_links
ALTER TABLE public_contract_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agentes can create links for their leads"
ON public_contract_links FOR INSERT
TO authenticated
WITH CHECK (
  agente_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_id 
    AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Agentes can view their contract links"
ON public_contract_links FOR SELECT
TO authenticated
USING (
  agente_id = auth.uid() OR 
  has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_id 
    AND leads.agente_asignado_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view link by token"
ON public_contract_links FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update link data by token"
ON public_contract_links FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Trigger para updated_at em contract_templates
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON contract_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- FASE 3: Sistema de Notificações

-- Criar enum para tipos de notificação
CREATE TYPE notification_type AS ENUM (
  'new_lead',
  'lead_stage_listo',
  'payment_deadline',
  'contract_signed'
);

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Função para notificar admins
CREATE OR REPLACE FUNCTION notify_admins(
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT ur.user_id, p_type, p_title, p_message, p_link, p_metadata
  FROM user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- Trigger para notificar quando novo lead é criado (de formulário)
CREATE OR REPLACE FUNCTION notify_new_lead_from_form()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar agente asignado
  IF NEW.agente_asignado_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.agente_asignado_id,
      'new_lead',
      'Novo Lead Atribuído',
      'Um novo lead "' || NEW.nombre_completo || '" foi criado a partir do formulário de qualificação.',
      '/crm',
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nombre_completo)
    );
  END IF;
  
  -- Notificar todos os admins
  PERFORM notify_admins(
    'new_lead',
    'Novo Lead Criado',
    'Um novo lead "' || NEW.nombre_completo || '" foi criado a partir do formulário de qualificação.',
    '/admin/crm',
    jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nombre_completo)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_lead
AFTER INSERT ON leads
FOR EACH ROW
WHEN (NEW.source = 'formulario_web')
EXECUTE FUNCTION notify_new_lead_from_form();

-- Trigger para notificar quando lead chega ao estágio "listo"
CREATE OR REPLACE FUNCTION notify_lead_listo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage AND NEW.stage = 'listo' THEN
    -- Notificar todos os admins
    PERFORM notify_admins(
      'lead_stage_listo',
      'Lead Pronto para Revisão',
      'O lead "' || NEW.nombre_completo || '" chegou ao estágio "Listo" e está pronto para revisão.',
      '/admin/crm',
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nombre_completo)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_lead_listo
AFTER UPDATE ON leads
FOR EACH ROW
WHEN (NEW.stage = 'listo')
EXECUTE FUNCTION notify_lead_listo();

-- Trigger para notificar quando contrato é assinado
CREATE OR REPLACE FUNCTION notify_contract_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agente_id UUID;
  v_lead_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    -- Buscar agente e nome do lead
    SELECT l.agente_asignado_id, l.nombre_completo
    INTO v_agente_id, v_lead_name
    FROM leads l
    WHERE l.id = NEW.lead_id;
    
    -- Notificar agente
    IF v_agente_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        v_agente_id,
        'contract_signed',
        'Contrato Assinado',
        'O lead "' || v_lead_name || '" assinou o contrato.',
        '/crm',
        jsonb_build_object('lead_id', NEW.lead_id, 'link_id', NEW.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_contract_signed
AFTER UPDATE ON public_contract_links
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION notify_contract_signed();

-- Habilitar realtime para notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;