export interface DatosSimulacion {
  valorInmueble: number;
  entrada: number;
  plazoMeses: number;
  tasaAnual: number;
  ingresos: number;
  deudas: number;
}

export interface ResultadosSimulacion {
  montoFinanciar: number;
  cuotaMensual: number;
  totalIntereses: number;
  montoTotalPagar: number;
  cualificado: boolean;
}

/**
 * Calcula a amortização usando o sistema francês (Price System)
 * Fórmula: cuota = P * [r * (1 + r)^n] / [(1 + r)^n - 1]
 * Onde:
 * - P = principal (monto a financiar)
 * - r = taxa mensal (taxa anual / 12 / 100)
 * - n = número de meses
 */
export function calcularAmortizacionFrancesa(datos: DatosSimulacion): ResultadosSimulacion {
  const { valorInmueble, entrada, plazoMeses, tasaAnual, ingresos, deudas } = datos;
  
  // Principal: valor do imóvel menos entrada
  const principal = valorInmueble - entrada;
  
  // Taxa mensal em decimal
  const tasaMensual = tasaAnual / 12 / 100;
  
  // Cálculo da cuota mensual usando fórmula francesa
  let cuotaMensual: number;
  
  if (tasaMensual === 0) {
    // Se taxa é zero, é apenas divisão simples
    cuotaMensual = principal / plazoMeses;
  } else {
    // Fórmula Price: P * [r * (1 + r)^n] / [(1 + r)^n - 1]
    const factor = Math.pow(1 + tasaMensual, plazoMeses);
    cuotaMensual = principal * (tasaMensual * factor) / (factor - 1);
  }
  
  // Cálculos derivados
  const montoTotalPagar = cuotaMensual * plazoMeses;
  const totalIntereses = montoTotalPagar - principal;
  
  // Verifica qualificação: (Ingresos - Deudas) >= 1050
  const capacidadPago = ingresos - deudas;
  const cualificado = capacidadPago >= 1050;
  
  return {
    montoFinanciar: principal,
    cuotaMensual,
    totalIntereses,
    montoTotalPagar,
    cualificado
  };
}

/**
 * Formata um número como valor em euros
 */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

/**
 * Formata a data e hora atual
 */
export function formatDateTime(): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}
