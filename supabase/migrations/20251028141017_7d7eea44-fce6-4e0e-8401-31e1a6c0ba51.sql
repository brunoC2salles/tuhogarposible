-- ============================================
-- Tabela de Configurações Admin
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: Somente admins podem ver/editar
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON public.admin_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Inserir webhook URL vazio por padrão
INSERT INTO public.admin_settings (key, value, description)
VALUES ('webhook_makecom_url', '', 'URL do webhook Make.com para integração com Bitrix24')
ON CONFLICT (key) DO NOTHING;

-- Trigger para updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Tabela de Logs de Webhook
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  status text NOT NULL, -- 'success', 'error'
  error_message text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS: Somente admins podem ver logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Índice para melhor performance nas consultas
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);