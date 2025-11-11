export type TipoContrato = 
  | 'compra_venta' 
  | 'alquiler' 
  | 'reserva' 
  | 'arras';

export interface DatosContrato {
  // Dados do Lead
  cliente_nombre: string;
  cliente_dni: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_direccion?: string;
  
  // Dados do Imóvel (se houver)
  inmueble_direccion?: string;
  inmueble_precio?: number;
  inmueble_referencia?: string;
  
  // Dados específicos do contrato
  fecha_contrato: string;
  valor_operacion: number;
  valor_reserva?: number;
  forma_pago?: string;
  plazo_dias?: number;
  
  // Campos adicionais personalizáveis
  campos_extras?: Record<string, any>;
}

export interface GeneratedContract {
  id: string;
  lead_id: string;
  inmueble_id?: string;
  tipo_contrato: TipoContrato;
  datos_contrato: DatosContrato;
  file_path?: string;
  generated_by: string;
  generated_at: string;
  notas?: string;
}

export const TIPO_CONTRATO_LABELS: Record<TipoContrato, string> = {
  compra_venta: 'Compraventa',
  alquiler: 'Alquiler',
  reserva: 'Reserva',
  arras: 'Arras'
};

// Tipos para sistema de contratos públicos
export interface ContractTemplate {
  id: string;
  nombre: string;
  descripcion?: string;
  campos_formulario: CampoFormulario[];
  template_content: string;
  activo: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampoFormulario {
  name: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'number' | 'select';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface PublicContractLink {
  id: string;
  token: string;
  lead_id: string;
  template_id: string;
  agente_id: string;
  status: 'pending' | 'completed' | 'expired';
  datos_completados?: Record<string, any>;
  contract_generated_id?: string;
  expires_at: string;
  completed_at?: string;
  created_at: string;
}
