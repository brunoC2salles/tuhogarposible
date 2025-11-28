-- FASE 2: Remover produtos Clickalia
-- Primeiro remover vínculos
DELETE FROM lead_inmuebles WHERE inmueble_id IN (SELECT id FROM inmuebles WHERE proveedor = 'Clickalia');
DELETE FROM reservas WHERE inmueble_id IN (SELECT id FROM inmuebles WHERE proveedor = 'Clickalia');
DELETE FROM scraping_progress WHERE inmueble_id IN (SELECT id FROM inmuebles WHERE proveedor = 'Clickalia');

-- Depois remover os produtos
DELETE FROM inmuebles WHERE proveedor = 'Clickalia';

-- FASE 3: Tabela para links externos
CREATE TABLE IF NOT EXISTS public.lead_external_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  titulo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para lead_external_links
ALTER TABLE public.lead_external_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agentes can view links of their leads" ON public.lead_external_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_external_links.lead_id 
      AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Agentes can create links for their leads" ON public.lead_external_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_external_links.lead_id 
      AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Agentes can delete links from their leads" ON public.lead_external_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE leads.id = lead_external_links.lead_id 
      AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- FASE 4: Tabela de faturas de produtos
CREATE TABLE IF NOT EXISTS public.product_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  lead_name TEXT NOT NULL,
  property_price NUMERIC NOT NULL,
  agent_id UUID REFERENCES profiles(id),
  
  -- Dados do cliente para faturação
  client_company_name TEXT NOT NULL,
  client_address TEXT NOT NULL,
  client_dni_nif TEXT NOT NULL,
  client_email TEXT NOT NULL,
  
  -- Serviços selecionados
  nota_simples BOOLEAN DEFAULT false,
  tasaciones BOOLEAN DEFAULT false,
  beneficios BOOLEAN DEFAULT false,
  inspeccion_tecnica BOOLEAN DEFAULT false,
  iva_incluido BOOLEAN DEFAULT false,
  comision_vivienda BOOLEAN DEFAULT false,
  comision_vivienda_percent NUMERIC,
  credito BOOLEAN DEFAULT false,
  credito_valor NUMERIC,
  hipoteca BOOLEAN DEFAULT false,
  hipoteca_percent NUMERIC,
  
  -- Totais calculados
  subtotal NUMERIC NOT NULL,
  iva_amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  
  -- Status e arquivos
  status TEXT DEFAULT 'draft',
  pdf_path TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_product_invoices_updated_at
BEFORE UPDATE ON public.product_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para product_invoices (somente admins)
ALTER TABLE public.product_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage product invoices" ON public.product_invoices
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Função para gerar próximo número de fatura
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_month TEXT;
  current_year TEXT;
  next_seq INT;
  prefix TEXT;
BEGIN
  current_month := to_char(now(), 'MM');
  current_year := to_char(now(), 'YYYY');
  prefix := 'THP-' || current_month || '-' || current_year || '-';
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM LENGTH(prefix) + 1) AS INT)
  ), 0) + 1 INTO next_seq
  FROM public.product_invoices
  WHERE invoice_number LIKE prefix || '%';
  
  RETURN prefix || LPAD(next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar bucket de storage para faturas
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para bucket de faturas (somente admins)
CREATE POLICY "Admins can upload invoices" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices' AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view invoices" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoices' AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete invoices" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'invoices' AND has_role(auth.uid(), 'admin')
  );