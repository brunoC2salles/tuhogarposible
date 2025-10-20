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

// ========== SIMULADOR HIPOTECARIO ==========

export interface DatosSimulacionHipoteca {
  precioVivienda: number;
  comunidadAutonoma: 'Madrid' | 'Cataluña' | 'Andalucía' | 'Valencia' | 'Otros';
  familiaNumerosa: boolean;
  menorDe35: boolean;
  situacionLaboral: 'autonomo' | 'empleado';
  ingresosMensuales: number;
  creditosPendientes: number;
  edad: number;
  tasaAnual: number;
  porcentajeFinanciamiento: number;
}

export interface ResultadosSimulacionHipoteca {
  montoFinanciable: number;
  capitalPropioNecesario: number;
  gastosImpuestos: number;
  cuotaMensual: number;
  plazoMaximoAnios: number;
  plazoMaximoMeses: number;
  hipotecaMaximaMensual: number;
  aprobable: boolean;
  totalIntereses: number;
  montoTotalPagar: number;
}

/**
 * Calcula gastos e impuestos según comunidad autónoma
 * Aplica descuentos por familia numerosa (50%) y menor de 35 años (10%)
 */
export function calcularGastosHipoteca(
  precio: number,
  comunidad: string,
  familiaNumerosa: boolean,
  menorDe35: boolean
): number {
  // Tasas base por comunidad (según documento PDF)
  const tasasComunidad: Record<string, number> = {
    'Madrid': 0.06,      // 6%
    'Cataluña': 0.10,    // 10%
    'Andalucía': 0.08,   // 8%
    'Valencia': 0.10,    // 10%
    'Otros': 0.09        // 9%
  };
  
  let tasa = tasasComunidad[comunidad] || 0.09;
  
  // Aplicar descuentos
  if (familiaNumerosa) {
    tasa *= 0.5; // 50% de descuento
  }
  if (menorDe35) {
    tasa *= 0.9; // 10% de descuento adicional
  }
  
  return precio * tasa;
}

/**
 * Calcula plazo máximo en años según edad
 * Interpolación lineal según documento:
 * - Edad <= 30: 30 años
 * - Edad 50: 20 años
 * - Edad >= 60: 10 años
 */
export function calcularPlazoMaximo(edad: number): number {
  if (edad <= 30) return 30;
  if (edad >= 60) return 10;
  
  // Interpolación lineal
  if (edad <= 50) {
    // Entre 30 y 50 años: de 30 a 20 años de plazo
    return 30 - ((edad - 30) * 10 / 20);
  } else {
    // Entre 50 y 60 años: de 20 a 10 años de plazo
    return 20 - ((edad - 50) * 10 / 10);
  }
}

/**
 * Calcula simulación completa de hipoteca
 */
export function calcularSimulacionHipoteca(
  datos: DatosSimulacionHipoteca
): ResultadosSimulacionHipoteca {
  const {
    precioVivienda,
    comunidadAutonoma,
    familiaNumerosa,
    menorDe35,
    ingresosMensuales,
    creditosPendientes,
    edad,
    tasaAnual,
    porcentajeFinanciamiento
  } = datos;
  
  // 1. Monto financiable: porcentaje configurado del precio
  const montoFinanciable = precioVivienda * (porcentajeFinanciamiento / 100);
  
  // 2. Gastos e impuestos
  const gastosImpuestos = calcularGastosHipoteca(
    precioVivienda,
    comunidadAutonoma,
    familiaNumerosa,
    menorDe35
  );
  
  // 3. Capital propio necesario: (100% - porcentaje financiamiento) + gastos
  const porcentajeCapitalPropio = (100 - porcentajeFinanciamiento) / 100;
  const capitalPropioNecesario = (precioVivienda * porcentajeCapitalPropio) + gastosImpuestos;
  
  // 4. Plazo máximo según edad
  const plazoMaximoAnios = calcularPlazoMaximo(edad);
  const plazoMaximoMeses = Math.floor(plazoMaximoAnios * 12);
  
  // 5. Hipoteca máxima mensual permitida: 30% ingresos - créditos
  const hipotecaMaximaMensual = (ingresosMensuales * 0.3) - creditosPendientes;
  
  // 6. Cuota mensual usando sistema francés
  const tasaMensual = tasaAnual / 12 / 100;
  let cuotaMensual: number;
  
  if (tasaMensual === 0) {
    cuotaMensual = montoFinanciable / plazoMaximoMeses;
  } else {
    const factor = Math.pow(1 + tasaMensual, plazoMaximoMeses);
    cuotaMensual = montoFinanciable * (tasaMensual * factor) / (factor - 1);
  }
  
  // 7. Cálculos derivados
  const montoTotalPagar = cuotaMensual * plazoMaximoMeses;
  const totalIntereses = montoTotalPagar - montoFinanciable;
  
  // 8. Verificar si es aprobable
  const aprobable = cuotaMensual <= hipotecaMaximaMensual;
  
  return {
    montoFinanciable,
    capitalPropioNecesario,
    gastosImpuestos,
    cuotaMensual,
    plazoMaximoAnios,
    plazoMaximoMeses,
    hipotecaMaximaMensual,
    aprobable,
    totalIntereses,
    montoTotalPagar
  };
}
