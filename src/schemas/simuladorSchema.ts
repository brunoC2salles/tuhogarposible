import { z } from 'zod';

export const simuladorCreditoSchema = z.object({
  nombreCompleto: z.string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome muito longo'),
  
  edad: z.number()
    .min(18, 'Idade mínima: 18 anos')
    .max(55, 'Idade máxima: 55 anos'),
  
  ingresosMensuales: z.number()
    .min(1050, 'Ingresos mínimos: 1050€'),
  
  deudasActuales: z.number()
    .min(0, 'Deudas não pode ser negativo'),
  
  entrada: z.number()
    .min(0, 'Entrada não pode ser negativa'),
  
  valorInmueble: z.number()
    .min(1000, 'Valor do imóvel deve ser maior que 1000€'),
  
  plazoMeses: z.number()
    .int('Prazo deve ser inteiro')
    .min(60, 'Prazo mínimo: 60 meses (5 anos)')
    .max(144, 'Prazo máximo: 144 meses (12 anos)'),
  
  tasaAnual: z.number()
    .min(3, 'Taxa mínima: 3%')
    .max(12, 'Taxa máxima: 12%')
}).refine(data => data.entrada <= data.valorInmueble, {
  message: 'Entrada não pode ser maior que o valor do imóvel',
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
    tipoContrato: z.enum(['fijo_discontinuo', 'indefinido', 'temporal']),
    antiguedadEmpresaAnios: z.number().int().min(0),
    antiguedadEmpresaMeses: z.number().int().min(0).max(11),
    ingresosMensuales: z.number().min(1, 'Ingresos deben ser positivos')
  })).optional(),
  
  // Datos de la vivienda
  precioVivienda: z.number()
    .min(10000, 'Precio de vivienda debe ser mayor a 10.000€'),
  
  comunidadAutonoma: z.enum(['Madrid', 'Cataluña', 'Andalucía', 'Valencia', 'Otros'], {
    required_error: 'Debe seleccionar una comunidad autónoma'
  }),
  
  familiaNumerosa: z.boolean(),
  menorDe35: z.boolean(),
  
  finalidadCompra: z.enum(['vivienda_habitual', 'segunda_residencia', 'inversion'], {
    required_error: 'Debe seleccionar la finalidad de la compra'
  }),
  
  dondeReside: z.string().trim().min(2).optional(),
  dondeCompra: z.string().trim().min(2).optional(),
  
  tienePropiedades: z.boolean(),
  propiedadesLibreCargas: z.boolean().optional(),
  
  // Situación laboral del titular principal
  situacionLaboral: z.enum(['autonomo', 'empleado'], {
    required_error: 'Debe seleccionar situación laboral'
  }),
  
  tipoContrato: z.enum(['fijo_discontinuo', 'indefinido', 'temporal'], {
    required_error: 'Debe seleccionar tipo de contrato'
  }),
  
  antiguedadEmpresaAnios: z.number().int().min(0, 'Antigüedad no puede ser negativa'),
  antiguedadEmpresaMeses: z.number().int().min(0).max(11, 'Meses debe ser entre 0 y 11'),
  
  ingresosMensuales: z.number()
    .min(1, 'Ingresos mensuales deben ser positivos'),
  
  // Situación financiera
  ahorrosDisponibles: z.number()
    .min(0, 'Ahorros no pueden ser negativos'),
  
  plazoHipotecaAnios: z.number()
    .int('Plazo debe ser entero')
    .min(10, 'Plazo mínimo: 10 años')
    .max(30, 'Plazo máximo: 30 años'),
  
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
  pagaPension: z.boolean().optional(),
  valorPension: z.number().min(0).optional(),
  
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
  if (data.finalidadCompra !== 'vivienda_habitual' && (!data.dondeReside || !data.dondeCompra)) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar dónde reside y dónde compra',
  path: ['dondeReside']
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
  if (data.estadoCivil === 'divorciado' && data.pagaPension === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar si paga pensión',
  path: ['pagaPension']
})
.refine(data => {
  if (data.estadoCivil === 'divorciado' && data.pagaPension && !data.valorPension) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar el valor de la pensión',
  path: ['valorPension']
})
.refine(data => {
  if (data.tieneHijos && (!data.numeroHijos || data.numeroHijos < 1)) {
    return false;
  }
  return true;
}, {
  message: 'Debe indicar el número de hijos',
  path: ['numeroHijos']
});

export type SimuladorHipotecaFormData = z.infer<typeof simuladorHipotecaSchema>;
