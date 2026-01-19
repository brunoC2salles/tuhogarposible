import { z } from "zod";

const titularSchema = z.object({
  nombreApellidos: z.string().min(1, "Nombre y apellidos requerido"),
  fechaNacimiento: z.string().min(1, "Fecha de nacimiento requerida"),
  dniNie: z.string().min(1, "DNI/NIE requerido"),
  estadoCivil: z.enum(["soltero", "casado", "divorciado", "viudo"], {
    errorMap: () => ({ message: "Estado civil requerido" }),
  }),
  numHijos: z.number().min(0, "Número de hijos debe ser 0 o mayor"),
  telefono: z.string().min(1, "Teléfono requerido"),
  profesion: z.string().min(1, "Profesión requerida"),
  tipoContrato: z.enum(["funcionario", "indefinido", "interino", "fijo_discontinuo", "temporal", "autonomo"], {
    errorMap: () => ({ message: "Tipo de contrato requerido" }),
  }),
  antiguedad: z.string().min(1, "Antigüedad requerida"),
  ingresosTotales: z.number().min(0, "Ingresos requeridos"),
  otrosIngresos: z.string().optional(),
  activosInmobiliarios: z.string().optional(),
  tienePrestamosPersonales: z.boolean(),
  tieneDeudas: z.boolean(),
});

export const formularioDescubiertaSchema = z.object({
  // Titular 1
  titular1: titularSchema,
  
  // Titular 2 (opcional)
  tieneSegundoTitular: z.boolean().default(false),
  titular2: titularSchema.optional(),
  
  // Datos de la Operación
  porcentajeFinanciacion: z.enum(["80", "90", "100"], {
    errorMap: () => ({ message: "Seleccione porcentaje de financiación" }),
  }),
  precioCompraventa: z.number().min(1, "Precio de compraventa requerido"),
  valorTasacionAproximado: z.number().min(1, "Valor de tasación requerido"),
  conPrestamoPersonal: z.boolean(),
  
  // Privacidad
  aceptaPrivacidad: z.boolean().refine(val => val === true, {
    message: "Debe aceptar la Política de Privacidad",
  }),
}).refine((data) => {
  // Si tiene segundo titular, validar que tenga datos
  if (data.tieneSegundoTitular && !data.titular2) {
    return false;
  }
  return true;
}, {
  message: "Complete los datos del segundo titular",
  path: ["titular2"],
});

export type FormularioDescubiertaData = z.infer<typeof formularioDescubiertaSchema>;
export type TitularData = z.infer<typeof titularSchema>;
