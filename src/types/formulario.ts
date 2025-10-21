import type { Database } from '@/integrations/supabase/types';

// Tipo base do banco de dados
export type FormSubmission = Database['public']['Tables']['form_submissions']['Row'];

// Tipo para inserção (sem campos gerados automaticamente)
export type FormSubmissionInsert = Database['public']['Tables']['form_submissions']['Insert'];

// Tipo para atualização
export type FormSubmissionUpdate = Database['public']['Tables']['form_submissions']['Update'];

// Interface para os dados do formulário (antes de salvar)
export interface FormularioData {
  // Dados pessoais
  nombre_completo: string;
  email: string;
  telefono: string;
  edad: number;
  
  // Dados de interesse
  ciudad_interes?: string;
  zona_interes?: string;
  valor_inmueble_deseado?: number;
  
  // Dados financeiros
  ingresos_mensuales: number;
  deudas_actuales?: number;
  entrada_disponible?: number;
  
  // Dados de emprego e benefícios
  situacion_laboral?: 'autonomo' | 'empleado';
  familia_numerosa?: boolean;
  menor_de_35?: boolean;
  comunidad_autonoma?: string;
}

// Interface para os dados do formulário de qualificação
export interface FormularioQualificacionData {
  // Dados pessoais
  nombre_completo: string;
  email: string;
  telefono: string;
  edad: number;
  
  // Interesse imobiliário
  comunidad_autonoma: string;
  ciudad_interes: string;
  
  // Situação financeira
  ingresos_mensuales: number;
  situacion_laboral: 'empleado' | 'autonomo' | 'pensionista' | 'desempleado';
  deudas_actuales?: number;
  en_fichero_morosidad: boolean;
  
  // Compra
  compra_solo_acompanado: 'solo' | 'acompanado';
  acompanante_nombre?: string;
  acompanante_relacion?: string;
  acompanante_aporte?: number;
  
  // Privacidade
  acepta_privacidad: boolean;
}

// Resultado de qualificação
export interface QualificacionResult {
  qualificado: boolean;
  razon_no_qualificado?: string;
  ingresos_totales: number;
}

// Tipos para os resultados dos simuladores (JSONB)
export interface SimuladorPersonalResult {
  montoAprobado: number;
  cuotaMensual: number;
  tasaAnual: number;
  plazoMeses: number;
  totalAPagar: number;
  aprobado: boolean;
  razonRechazo?: string;
  detalles?: {
    ingresosMensuales: number;
    deudasActuales: number;
    relacionDeudaIngreso: number;
    capacidadPago: number;
  };
}

export interface SimuladorHipotecarioResult {
  aprobado: boolean;
  montoFinanciado: number;
  montoAprobado: number;
  cuotaMensual: number;
  gastos: number;
  capitalRequerido: number;
  relacionDeudaIngreso: number;
  razonRechazo?: string;
  detalles?: {
    precioVivienda: number;
    porcentajeFinanciamiento: number;
    tasaAnual: number;
    plazoAnios: number;
    totalAPagar: number;
    comunidadAutonoma: string;
  };
}
