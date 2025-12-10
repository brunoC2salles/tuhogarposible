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
  agente_id?: string;
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
  agente_id?: string;
  created_at: string;
  updated_at: string;
}

export const CATEGORIAS_DESPESA = [
  'Pessoal Interno',
  'Pessoal Externo',
  'SaaS / Ferramentas',
  'Marketing',
  'Infraestrutura',
  'Impostos',
  'Custos Bancários',
  'Transporte',
  'Outros'
] as const;

// Service costs - fixed and editable
export const DEFAULT_SERVICE_COSTS: Record<string, number> = {
  nota_simples: 10,
  tasaciones: 315,
  beneficios: 0,
  inspeccion_tecnica: 0,
  iva_incluido: 0,
  comision_vivienda: 0,
  credito: 0,
  hipoteca: 0
};

export const METODOS_PAGAMENTO = [
  'Dinheiro',
  'Transferência',
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Outro'
] as const;
