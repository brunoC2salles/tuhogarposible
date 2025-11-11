-- Tabela de despesas operacionais
CREATE TABLE despesas_operacionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data_despesa date NOT NULL,
  categoria text NOT NULL,
  metodo_pagamento text,
  notas text,
  comprovante_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de faturações
CREATE TABLE faturacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data_faturacao date NOT NULL,
  cliente_nome text,
  lead_id uuid REFERENCES leads(id),
  numero_fatura text,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  notas text,
  arquivo_fatura_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS para despesas
ALTER TABLE despesas_operacionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage despesas"
  ON despesas_operacionais
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS para faturações
ALTER TABLE faturacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage faturacoes"
  ON faturacoes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Triggers para updated_at
CREATE TRIGGER update_despesas_updated_at
  BEFORE UPDATE ON despesas_operacionais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faturacoes_updated_at
  BEFORE UPDATE ON faturacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();