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
  montoMaximoCredito: number; // Novo campo
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
  
  // NOVO: Calcular máximo de crédito pessoal baseado em 35% dos ingresos
  const capacidadMensual = (ingresos * 0.35) - deudas;
  let montoMaximoCredito = 0;
  
  if (capacidadMensual > 0 && tasaMensual > 0) {
    // Fórmula inversa: P = C * [(1 + r)^n - 1] / [r * (1 + r)^n]
    const factor = Math.pow(1 + tasaMensual, plazoMeses);
    montoMaximoCredito = capacidadMensual * (factor - 1) / (tasaMensual * factor);
  } else if (capacidadMensual > 0 && tasaMensual === 0) {
    montoMaximoCredito = capacidadMensual * plazoMeses;
  }
  
  return {
    montoFinanciar: principal,
    cuotaMensual,
    totalIntereses,
    montoTotalPagar,
    cualificado,
    montoMaximoCredito: Math.max(0, montoMaximoCredito)
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
  // Dados dos titulares
  nombreCompleto: string;
  edad: number;
  numeroTitulares: '1' | '2' | '3';
  
  // Campos de pagas y bonus del titular principal
  numeroPagas: number;
  cobraBonusAnual: boolean;
  valorBonusAnual?: number;

  esResidenteFiscalEspana: boolean;
  
  titulares?: Array<{
    nombreCompleto: string;
    edad: number;
    relacionPrincipal: 'pareja' | 'marido_mujer' | 'padre_madre_hijo';
    situacionLaboral: 'autonomo' | 'empleado';
    tipoContrato: 'fijo_discontinuo' | 'indefinido' | 'temporal' | 'interino' | 'funcionario';
    antiguedadEmpresaAnios: number;
    antiguedadEmpresaMeses: number;
    antiguedadContinuadaAnios: number;
    antiguedadContinuadaMeses: number;
    ingresosMensuales: number;
    numeroPagas: number;
    cobraBonusAnual: boolean;
    valorBonusAnual?: number;
    ahorrosDisponibles: number;
  }>;
  
  // Dados da vivienda
  precioVivienda: number;
  comunidadAutonoma: 'Andalucía' | 'Aragón' | 'Asturias' | 'Baleares' | 'Canarias' | 'Cantabria' | 
    'Castilla-La Mancha' | 'Castilla y León' | 'Cataluña' | 'Ceuta' | 'Comunidad de Madrid' | 
    'Comunidad Valenciana' | 'Extremadura' | 'Galicia' | 'La Rioja' | 'Melilla' | 'Murcia' | 
    'Navarra' | 'País Vasco';
  familiaNumerosa: boolean;
  menorDe35: boolean;
  finalidadCompra: 'vivienda_habitual' | 'segunda_residencia' | 'inversion';
  dondeReside?: string;
  dondeCompra?: string;
  tienePropiedades: boolean;
  propiedadesLibreCargas?: boolean;
  
  // Situação laboral do titular principal
  situacionLaboral: 'autonomo' | 'empleado';
  tipoContrato: 'fijo_discontinuo' | 'indefinido' | 'temporal' | 'interino' | 'funcionario';
  antiguedadEmpresaAnios: number;
  antiguedadEmpresaMeses: number;
  antiguedadContinuadaAnios: number;
  antiguedadContinuadaMeses: number;
  ingresosMensuales: number;
  
  // Situação financeira
  ahorrosDisponibles: number;
  plazoHipotecaAnios: number;
  tieneCreditos: boolean;
  creditos?: Array<{
    tipo: 'personal' | 'reformas' | 'unificacion' | 'financiacion_compra';
    cuotaMensual: number;
  }>;
  
  // Dados pessoais
  estadoCivil: 'soltero' | 'casado' | 'divorciado';
  regimenMatrimonial?: 'gananciales' | 'separacion_bienes';
  pagaManutención?: boolean;
  valorManutención?: number;
}

export interface ResultadosSimulacionHipoteca {
  montoFinanciable: number;
  capitalPropioNecesario: number;
  gastosImpuestos: number;
  cuotaMensual: number;
  plazoMaximoAnios: number;
  plazoMaximoMeses: number;
  hipotecaMaximaMensual: number;
  montoMaximoFinanciable: number;
  aprobable: boolean;
  capitalPropioSuficiente: boolean;
  totalIntereses: number;
  montoTotalPagar: number;
  // Novos campos
  porcentajeFinanciamiento: number;
  ingresosTotales: number;
  gastosPension: number;
  tasaAnualFija: number;
  razonNoAprobado?: string;
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
  // Tasas de ITP por comunidad autónoma (valores exactos 2024)
  const tasasComunidad: Record<string, number> = {
    'Andalucía': 0.07,
    'Aragón': 0.08,
    'Asturias': 0.08,
    'Baleares': 0.08,
    'Canarias': 0.065,
    'Cantabria': 0.10,
    'Castilla-La Mancha': 0.09,
    'Castilla y León': 0.08,
    'Cataluña': 0.10,
    'Ceuta': 0.06,
    'Comunidad de Madrid': 0.06,
    'Comunidad Valenciana': 0.10,
    'Extremadura': 0.08,
    'Galicia': 0.08,
    'La Rioja': 0.07,
    'Melilla': 0.06,
    'Murcia': 0.08,
    'Navarra': 0.06,
    'País Vasco': 0.04
  };
  
  let tasa = tasasComunidad[comunidad] || 0.08;
  
  // Aplicar descuentos
  if (familiaNumerosa) {
    tasa *= 0.5; // 50% de descuento
  }
  if (menorDe35) {
    tasa *= 0.9; // 10% de descuento adicional
  }
  
  // ITP + gastos adicionais fixos de 2000€
  const gastosAdicionais = 2000;
  return (precio * tasa) + gastosAdicionais;
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
 * Determina el mejor tipo de contrato entre todos los titulares
 * Prioridad: Funcionario > Interino/Indefinido/Fijo Discontinuo > Temporal
 */
function determinarMejorContrato(
  contratoMain: string, 
  titulares?: Array<{ tipoContrato: string }>
): string {
  const todosContratos = [contratoMain];
  
  if (titulares && titulares.length > 0) {
    todosContratos.push(...titulares.map(t => t.tipoContrato));
  }
  
  // Verifica se tem funcionario
  if (todosContratos.includes('funcionario')) {
    return 'funcionario';
  }
  
  // Verifica se tem interino, indefinido ou fijo_discontinuo
  if (todosContratos.some(c => ['interino', 'indefinido', 'fijo_discontinuo'].includes(c))) {
    return 'interino'; // Retorna interino como representante do grupo 90%
  }
  
  // Se só tem temporal
  return 'temporal';
}

/**
 * Calcula el porcentaje de financiamiento aplicando el MENOR porcentaje entre todas las limitaciones
 * REGLAS:
 * 1. No residente fiscal → máximo 70%
 * 2. Inversión → máximo 50%
 * 3. Segunda residencia → máximo 70%
 * 4. Tipo de contrato:
 *    - Funcionario: 100%
 *    - Interino/Fijo Discontinuo/Indefinido: 90%
 *    - Temporal: 0%
 * 
 * SE APLICA EL MENOR PORCENTAJE (ejemplo: no residente + inversión = 50%)
 */
function calcularPorcentajeFinanciamiento(
  mejorContrato: string,
  finalidadCompra: 'vivienda_habitual' | 'segunda_residencia' | 'inversion',
  esResidenteFiscal: boolean
): number {
  const limitaciones: number[] = [];

  // 1. LIMITACIÓN POR RESIDENCIA FISCAL
  if (!esResidenteFiscal) {
    limitaciones.push(70);
  }

  // 2. LIMITACIÓN POR FINALIDAD DE COMPRA
  if (finalidadCompra === 'inversion') {
    limitaciones.push(50);
  } else if (finalidadCompra === 'segunda_residencia') {
    limitaciones.push(70);
  }

  // 3. LIMITACIÓN POR TIPO DE CONTRATO (solo si es vivienda habitual Y residente fiscal)
  if (finalidadCompra === 'vivienda_habitual' && esResidenteFiscal) {
    if (mejorContrato === 'funcionario') {
      limitaciones.push(100);
    } else if (['interino', 'fijo_discontinuo', 'indefinido'].includes(mejorContrato)) {
      limitaciones.push(90);
    } else {
      limitaciones.push(0); // temporal
    }
  }

  // Si no hay limitaciones específicas, aplicar regla de contrato
  if (limitaciones.length === 0) {
    if (mejorContrato === 'funcionario') return 100;
    if (['interino', 'fijo_discontinuo', 'indefinido'].includes(mejorContrato)) return 90;
    return 0;
  }

  // APLICAR EL MENOR PORCENTAJE
  const porcentajeFinal = Math.min(...limitaciones);
  
  console.log('[Financiamiento] Cálculo:', {
    mejorContrato,
    finalidadCompra,
    esResidenteFiscal,
    limitaciones,
    porcentajeFinal
  });

  return porcentajeFinal;
}

/**
 * Calcula simulación completa de hipoteca con nuevos parámetros
 */
export function calcularSimulacionHipoteca(datos: DatosSimulacionHipoteca): ResultadosSimulacionHipoteca {
  console.log('[Hipoteca] Iniciando cálculo de simulação hipotecária');
  console.log('[Hipoteca] Datos:', datos);

  // 1. VALIDAÇÕES INICIAIS
  if (datos.precioVivienda <= 0) {
    throw new Error('El precio de la vivienda debe ser mayor a 0');
  }
  if (datos.ingresosMensuales <= 0) {
    throw new Error('Los ingresos mensuales deben ser mayores a 0');
  }

  // 1. TAXA FIXA
  const tasaAnualFija = 3.5;
  const tasaMensual = tasaAnualFija / 12 / 100;
  
  // Função auxiliar para calcular ingresos anualizados
  const calcularIngresosAnualizados = (
    ingresosMensuales: number,
    numeroPagas: number,
    cobraBonusAnual: boolean,
    valorBonusAnual?: number
  ): number => {
    const ingresosPagas = (ingresosMensuales * numeroPagas) / 12;
    const bonus = (cobraBonusAnual && valorBonusAnual) ? valorBonusAnual / 12 : 0;
    return ingresosPagas + bonus;
  };

  // 0. DETERMINAR MELHOR CONTRATO ENTRE TODOS OS TITULARES
  const mejorContrato = determinarMejorContrato(datos.tipoContrato, datos.titulares);
  console.log(`[Hipoteca] Melhor contrato entre titulares: ${mejorContrato}`);
  
  // 2. INGRESOS TOTALES (com pagas e bonus + verificação de contratos temporales)
  let ingresosTotales = 0;

  // TITULAR PRINCIPAL
  if (datos.tipoContrato === 'temporal') {
    console.warn('[Hipoteca] Titular principal com contrato temporal - ingresos não computados');
    
    // Se só tem 1 titular temporal, não é viável
    if (datos.numeroTitulares === '1') {
      const gastosHipoteca = calcularGastosHipoteca(
        datos.precioVivienda,
        datos.comunidadAutonoma,
        datos.familiaNumerosa,
        datos.menorDe35
      );
      
      return {
        montoFinanciable: 0,
        capitalPropioNecesario: datos.precioVivienda + gastosHipoteca,
        gastosImpuestos: gastosHipoteca,
        cuotaMensual: 0,
        plazoMaximoAnios: 0,
        plazoMaximoMeses: 0,
        hipotecaMaximaMensual: 0,
        montoMaximoFinanciable: 0,
        aprobable: false,
        capitalPropioSuficiente: false,
        totalIntereses: 0,
        montoTotalPagar: 0,
        porcentajeFinanciamiento: 0,
        ingresosTotales: 0,
        gastosPension: 0,
        tasaAnualFija: 3.5
      };
    }
  } else {
    // Titular principal tem contrato válido
    ingresosTotales = calcularIngresosAnualizados(
      datos.ingresosMensuales,
      datos.numeroPagas,
      datos.cobraBonusAnual,
      datos.valorBonusAnual
    );
  }

  // TITULARES ADICIONAIS (só conta indefinidos e fijo_discontinuo)
  if (datos.numeroTitulares !== '1' && datos.titulares && datos.titulares.length > 0) {
    datos.titulares.forEach(titular => {
      if (titular.tipoContrato === 'indefinido' || titular.tipoContrato === 'fijo_discontinuo') {
        ingresosTotales += calcularIngresosAnualizados(
          titular.ingresosMensuales,
          titular.numeroPagas,
          titular.cobraBonusAnual,
          titular.valorBonusAnual
        );
      } else {
        console.warn('[Hipoteca] Titular adicional com contrato temporal - ingresos não computados');
      }
    });
  }

  // Se nenhum titular válido, não aprovável
  if (ingresosTotales === 0) {
    const gastosHipoteca = calcularGastosHipoteca(
      datos.precioVivienda,
      datos.comunidadAutonoma,
      datos.familiaNumerosa,
      datos.menorDe35
    );
    
    return {
      montoFinanciable: 0,
      capitalPropioNecesario: datos.precioVivienda + gastosHipoteca,
      gastosImpuestos: gastosHipoteca,
      cuotaMensual: 0,
      plazoMaximoAnios: 0,
      plazoMaximoMeses: 0,
      hipotecaMaximaMensual: 0,
      montoMaximoFinanciable: 0,
      aprobable: false,
      capitalPropioSuficiente: false,
      totalIntereses: 0,
      montoTotalPagar: 0,
        porcentajeFinanciamiento: 0,
        ingresosTotales: 0,
        gastosPension: 0,
        tasaAnualFija: 3.5
      };
    }
  
  // 3. CRÉDITOS PENDIENTES TOTALES
  let creditosPendientesTotales = 0;
  if (datos.tieneCreditos && datos.creditos && datos.creditos.length > 0) {
    creditosPendientesTotales = datos.creditos.reduce((sum, c) => sum + c.cuotaMensual, 0);
  }
  
  // 4. GASTOS POR MANUTENCIÓN
  const gastosPension = (datos.estadoCivil === 'divorciado' && datos.pagaManutención && datos.valorManutención) 
    ? datos.valorManutención 
    : 0;
  
  // 6. GASTOS E IMPUESTOS DA HIPOTECA (por comunidad autónoma)
  const gastosImpuestos = calcularGastosHipoteca(
    datos.precioVivienda,
    datos.comunidadAutonoma,
    datos.familiaNumerosa,
    datos.menorDe35
  );
  
  // 7. PORCENTAJE DE FINANCIAMIENTO (aplicando el menor entre todas las limitaciones)
  const porcentajeFinanciamiento = calcularPorcentajeFinanciamiento(
    mejorContrato,
    datos.finalidadCompra,
    datos.esResidenteFiscalEspana
  );
  
  // 8. MONTO FINANCIABLE
  const montoFinanciable = datos.precioVivienda * (porcentajeFinanciamiento / 100);
  
  // 9. CAPITAL PROPIO NECESÁRIO
  // Entrada necessária = valor que NÃO é financiado
  const entradaNecesaria = datos.precioVivienda - montoFinanciable;
  
  const capitalPropioNecesario = entradaNecesaria + gastosImpuestos;
  
  // 10. PLAZO EFECTIVO
  const edadMaxima = datos.numeroTitulares === '1' 
    ? datos.edad 
    : Math.max(datos.edad, ...(datos.titulares || []).map(t => t.edad));
  
  const plazoMaximoPorEdad = calcularPlazoMaximo(edadMaxima);
  const plazoEfectivoAnios = Math.min(datos.plazoHipotecaAnios, plazoMaximoPorEdad);
  const plazoEfectivoMeses = plazoEfectivoAnios * 12;
  
  // 11. HIPOTECA MÁXIMA MENSUAL (35% dos ingresos)
  const hipotecaMaximaMensual = Math.max(
    0,
    (ingresosTotales * 0.35) - creditosPendientesTotales - gastosPension
  );
  
  // 11.5. MONTO MÁXIMO FINANCIABLE (baseado na capacidade de pagamento mensal)
  // Fórmula inversa do Sistema Francês: P = cuota × [(1 + r)^n - 1] / [r × (1 + r)^n]
  let montoMaximoFinanciable = 0;
  if (hipotecaMaximaMensual > 0 && plazoEfectivoMeses > 0 && tasaMensual > 0) {
    const factor = Math.pow(1 + tasaMensual, plazoEfectivoMeses);
    montoMaximoFinanciable = hipotecaMaximaMensual * (factor - 1) / (tasaMensual * factor);
  }
  
  // 12. CUOTA MENSUAL (Sistema Francês)
  let cuotaMensual = 0;
  if (montoFinanciable > 0 && plazoEfectivoMeses > 0) {
    const factor = Math.pow(1 + tasaMensual, plazoEfectivoMeses);
    cuotaMensual = montoFinanciable * (tasaMensual * factor) / (factor - 1);
  }
  
  // 13. TOTALES
  const montoTotalPagar = cuotaMensual * plazoEfectivoMeses;
  const totalIntereses = montoTotalPagar - montoFinanciable;
  
  // 14. APROBABLE
  // Separar critérios: aprovação por ingresos vs capital próprio
  const aprobablePorIngresos = cuotaMensual <= hipotecaMaximaMensual;
  const capitalPropioSuficiente = datos.ahorrosDisponibles >= capitalPropioNecesario;
  
  // Definir aprobable baseado principalmente na capacidade de pagamento
  const aprobable = aprobablePorIngresos;
  
  return {
    montoFinanciable,
    capitalPropioNecesario,
    gastosImpuestos,
    cuotaMensual,
    plazoMaximoAnios: plazoEfectivoAnios,
    plazoMaximoMeses: plazoEfectivoMeses,
    hipotecaMaximaMensual,
    montoMaximoFinanciable,
    aprobable,
    capitalPropioSuficiente,
    totalIntereses,
    montoTotalPagar,
    porcentajeFinanciamiento,
    ingresosTotales,
    gastosPension,
    tasaAnualFija
  };
}
