
-- Create lead_services table for tracking services selected per lead
CREATE TABLE public.lead_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_price NUMERIC NOT NULL DEFAULT 0,
  
  -- Fixed services (checkboxes)
  nota_simples BOOLEAN DEFAULT false,
  tasaciones BOOLEAN DEFAULT false,
  beneficios BOOLEAN DEFAULT false,
  inspeccion_tecnica BOOLEAN DEFAULT false,
  iva_incluido BOOLEAN DEFAULT false,
  
  -- Variable services
  comision_vivienda BOOLEAN DEFAULT false,
  comision_vivienda_percent NUMERIC DEFAULT 1,
  exclusivo BOOLEAN DEFAULT false, -- When true, allows up to 7% commission
  
  credito BOOLEAN DEFAULT false,
  credito_valor NUMERIC DEFAULT 300,
  
  hipoteca BOOLEAN DEFAULT false,
  hipoteca_percent NUMERIC DEFAULT 0.4, -- Default 0.4%
  
  -- Client billing details (imobiliária)
  client_company_name TEXT,
  client_address TEXT,
  client_dni_nif TEXT,
  client_email TEXT,
  
  -- Calculated totals (stored for reference)
  subtotal NUMERIC DEFAULT 0,
  iva_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(lead_id)
);

-- Create agent_variable_costs table for tracking commissions
CREATE TABLE public.agent_variable_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.product_invoices(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'pagado'
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_variable_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_services
CREATE POLICY "Agents can manage services for their leads"
ON public.lead_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = lead_services.lead_id
    AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = lead_services.lead_id
    AND (leads.agente_asignado_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

CREATE POLICY "Supervisors can view lead services"
ON public.lead_services
FOR SELECT
USING (has_role(auth.uid(), 'supervisor'::user_role));

-- RLS policies for agent_variable_costs
CREATE POLICY "Admins can manage all variable costs"
ON public.agent_variable_costs
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Agents can view their own variable costs"
ON public.agent_variable_costs
FOR SELECT
USING (agent_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_lead_services_lead_id ON public.lead_services(lead_id);
CREATE INDEX idx_agent_variable_costs_agent_id ON public.agent_variable_costs(agent_id);
CREATE INDEX idx_agent_variable_costs_invoice_id ON public.agent_variable_costs(invoice_id);
CREATE INDEX idx_agent_variable_costs_status ON public.agent_variable_costs(status);

-- Trigger to update updated_at
CREATE TRIGGER update_lead_services_updated_at
BEFORE UPDATE ON public.lead_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_variable_costs_updated_at
BEFORE UPDATE ON public.agent_variable_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
