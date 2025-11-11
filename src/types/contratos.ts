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
