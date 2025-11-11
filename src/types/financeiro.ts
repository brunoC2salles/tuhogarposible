export interface DespesaOperacional {
  id: string;
  descricao: string;
  valor: number;
  data_despesa: string;
  categoria: string;
  metodo_pagamento?: string;
  notas?: string;
  comprovante_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Faturacao {
  id: string;
  descricao: string;
  valor: number;
  data_faturacao: string;
  cliente_nome?: string;
  lead_id?: string;
  numero_fatura?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  notas?: string;
  arquivo_fatura_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const CATEGORIAS_DESPESA = [
  'Aluguel',
  'Salários',
  'Marketing',
  'Tecnologia',
  'Transporte',
  'Suprimentos',
  'Serviços Profissionais',
  'Outros'
] as const;

export const METODOS_PAGAMENTO = [
  'Dinheiro',
  'Transferência',
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Outro'
] as const;
