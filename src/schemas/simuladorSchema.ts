import { z } from 'zod';

export const simuladorCreditoSchema = z.object({
  nombreCompleto: z.string()
    .trim()
    .min(3, 'Nombre debe tener mínimo 3 caracteres')
    .max(100, 'Nombre demasiado largo'),
  
  edad: z.number()
    .min(18, 'Edad mínima: 18 años')
    .max(55, 'Edad máxima: 55 años'),
  
  ingresosMensuales: z.number()
    .min(1050, 'Ingresos mínimos: 1050€'),
  
  deudasActuales: z.number()
    .min(0, 'Deudas no pueden ser negativas'),
  
  entrada: z.number()
    .min(0, 'Entrada no puede ser negativa'),
  
  valorInmueble: z.number()
    .min(1000, 'Valor del inmueble debe ser mayor a 1000€'),
  
  plazoMeses: z.number()
    .int('Plazo debe ser entero')
    .min(60, 'Plazo mínimo: 60 meses (5 años)')
    .max(144, 'Plazo máximo: 144 meses (12 años)'),
  
  tasaAnual: z.number()
    .min(3, 'Tasa mínima: 3%')
    .max(12, 'Tasa máxima: 12%')
}).refine(data => data.entrada <= data.valorInmueble, {
  message: 'Entrada no puede ser mayor que el valor del inmueble',
  path: ['entrada']
});

export type SimuladorCreditoFormData = z.infer<typeof simuladorCreditoSchema>;

// ========== SIMULADOR HIPOTECARIO ==========

export const simuladorHipotecaSchema = z.object({
  // Titular principal
  nombreCompleto: z.string()
    .trim()
    .min(3, 'Nombre debe tener mínimo 3 caracteres')
    .max(100, 'Nombre muy largo'),
  
  edad: z.number()
    .int('Edad debe ser un número entero')
    .min(18, 'Edad mínima: 18 años')
    .max(65, 'Edad máxima: 65 años'),
  
  // Número de titulares (máximo 3)
  numeroTitulares: z.enum(['1', '2', '3'], {
    required_error: 'Debe seleccionar el número de titulares'
  }),
  
  // Titulares adicionales
  titulares: z.array(z.object({
    nombreCompleto: z.string().trim().min(3, 'Nombre mínimo 3 caracteres').max(100),
    edad: z.number().int().min(18, 'Edad mínima: 18').max(65, 'Edad máxima: 65'),
    relacionPrincipal: z.enum(['pareja', 'marido_mujer', 'padre_madre_hijo'], {
      required_error: 'Debe especificar la relación'
    }),
    situacionLaboral: z.enum(['autonomo', 'empleado']),
    tipoContrato: z.enum(['indefinido', 'temporal', 'fijo_discontinuo', 'interino', 'funcionario']),
    antiguedadEmpresaAnios: z.number().int().min(0),
    antiguedadEmpresaMeses: z.number().int().min(0).max(11),
    antiguedadContinuadaAnios: z.number().int().min(0),
    antiguedadContinuadaMeses: z.number().int().min(0).max(11),
    ingresosMensuales: z.number().min(1, 'Ingresos deben ser positivos'),
    numeroPagas: z.number().int().min(12).max(15),
    cobraBonusAnual: z.boolean(),
    valorBonusAnual: z.number().min(0).optional(),
    ahorrosDisponibles: z.number().min(0).optional()
  })).optional(),
  
  // Datos de la vivienda
  precioVivienda: z.number()
    .min(10000, 'Precio de vivienda debe ser mayor a 10.000€'),
  
  comunidadAutonoma: z.enum([
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
    'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Ceuta',
    'Comunidad de Madrid', 'Comunidad Valenciana', 'Extremadura', 'Galicia',
    'La Rioja', 'Melilla', 'Murcia', 'Navarra', 'País Vasco'
  ], {
    required_error: 'Debe seleccionar una comunidad autónoma'
  }),
  
  familiaNumerosa: z.boolean(),
  menorDe35: z.boolean(),
  
  finalidadCompra: z.enum(['vivienda_habitual', 'segunda_residencia', 'inversion'], {
    required_error: 'Debe seleccionar la finalidad de la compra'
  }),
  
  
  tienePropiedades: z.boolean(),
  propiedadesLibreCargas: z.boolean().optional(),
  
  // Situación laboral del titular principal
  situacionLaboral: z.enum(['autonomo', 'empleado'], {
    required_error: 'Debe seleccionar situación laboral'
  }),
  
  tipoContrato: z.enum(['indefinido', 'temporal', 'fijo_discontinuo', 'interino', 'funcionario'], {
    required_error: 'Debe seleccionar tipo de contrato'
  }),
  
  antiguedadEmpresaAnios: z.number().int().min(0, 'Antigüedad no puede ser negativa'),
  antiguedadEmpresaMeses: z.number().int().min(0).max(11, 'Meses debe ser entre 0 y 11'),
  
  antiguedadContinuadaAnios: z.number()
    .int('Antigüedad continuada en años debe ser entero')
    .min(0, 'Antigüedad continuada no puede ser negativa'),
  
  antiguedadContinuadaMeses: z.number()
    .int('Meses debe ser entero')
    .min(0, 'Meses no pueden ser negativos')
    .max(11, 'Meses debe ser entre 0 y 11'),
  
  ingresosMensuales: z.number()
    .min(1, 'Ingresos mensuales deben ser positivos'),
  numeroPagas: z.number().int().min(12).max(15),
  cobraBonusAnual: z.boolean(),
  valorBonusAnual: z.number().min(0).optional(),

  esResidenteFiscalEspana: z.boolean({
    required_error: 'Debe indicar si es residente fiscal en España'
  }),
  
  // Situación financiera
  ahorrosDisponibles: z.number()
    .min(0, 'Ahorros no pueden ser negativos'),
  
  plazoHipotecaAnios: z.number()
    .int('Plazo debe ser entero')
    .min(10, 'Plazo mínimo: 10 años')
    .max(40, 'Plazo máximo: 40 años'),
  
  tieneCreditos: z.boolean(),
  
  creditos: z.array(z.object({
    tipo: z.enum(['personal', 'reformas', 'unificacion', 'financiacion_compra']),
    cuotaMensual: z.number().min(0, 'Cuota no puede ser negativa')
  })).optional(),
  
  // Datos personales
  estadoCivil: z.enum(['soltero', 'casado', 'divorciado'], {
    required_error: 'Debe seleccionar estado civil'
  }),
  
  regimenMatrimonial: z.enum(['gananciales', 'separacion_bienes']).optional(),
  pagaManutención: z.boolean().optional(),
  valorManutención: z.number().min(0).optional(),
  
  tieneHijos: z.boolean(),
  numeroHijos: z.number().int().min(1).optional()
})
.refine(data => {
  if (data.numeroTitulares !== '1' && (!data.titulares || data.titulares.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Debe agregar los datos de todos los titulares',
  path: ['titulares']
})
.refine(data => {
  if (data.numeroTitulares === '2' && data.titulares && data.titulares.length !== 1) {
    return false;
  }
  if (data.numeroTitulares === '3' && data.titulares && data.titulares.length !== 2) {
    return false;
  }
  return true;
}, {
  message: 'Número de titulares adicionales incorrecto',
  path: ['titulares']
})
.refine(data => {
  if (data.tieneCreditos && (!data.creditos || data.creditos.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Debe agregar al menos un crédito',
  path: ['creditos']
})
.refine(data => {
  if (data.tienePropiedades && data.propiedadesLibreCargas === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar si las propiedades están libres de cargas',
  path: ['propiedadesLibreCargas']
})
.refine(data => {
  if (data.estadoCivil === 'casado' && !data.regimenMatrimonial) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar el régimen matrimonial',
  path: ['regimenMatrimonial']
})
.refine(data => {
  if (data.estadoCivil === 'divorciado' && data.pagaManutención === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar si paga manutención',
  path: ['pagaManutención']
})
.refine(data => {
  if (data.estadoCivil === 'divorciado' && data.pagaManutención && !data.valorManutención) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar el valor de la manutención',
  path: ['valorManutención']
})
.refine(data => {
  if (data.tieneHijos && (!data.numeroHijos || data.numeroHijos < 1)) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar el número de hijos',
  path: ['numeroHijos']
})
.refine(data => {
  const totalAnios = data.antiguedadContinuadaAnios + (data.antiguedadContinuadaMeses / 12);
  const totalEmpresa = data.antiguedadEmpresaAnios + (data.antiguedadEmpresaMeses / 12);
  return totalAnios >= totalEmpresa;
}, {
  message: 'Antigüedad continuada debe ser mayor o igual a antigüedad en empresa actual',
  path: ['antiguedadContinuadaAnios']
});

export type SimuladorHipotecaFormData = z.infer<typeof simuladorHipotecaSchema>;
