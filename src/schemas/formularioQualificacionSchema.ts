import { z } from "zod";

export const formularioQualificacionSchema = z.object({
  // Dados pessoais
  nombre_completo: z.string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "El email no puede exceder 255 caracteres"),
  
  telefono: z.string()
    .trim()
    .min(9, "El teléfono debe tener al menos 9 dígitos")
    .max(20, "El teléfono no puede exceder 20 caracteres"),
  
  edad: z.number()
    .int("La edad debe ser un número entero")
    .min(18, "Debes tener al menos 18 años")
    .max(100, "La edad no puede exceder 100 años"),
  
  // Interesse imobiliário
  comunidad_autonoma: z.string()
    .trim()
    .min(1, "Selecciona una comunidad autónoma"),
  
  ciudad_interes: z.string()
    .trim()
    .min(2, "La ciudad debe tener al menos 2 caracteres")
    .max(100, "La ciudad no puede exceder 100 caracteres"),
  
  valor_inmueble_deseado: z.number()
    .min(10000, "El valor del inmueble debe ser al menos 10.000€")
    .max(5000000, "El valor del inmueble no puede exceder 5.000.000€"),
  
  finalidad_compra: z.enum(["vivienda_habitual", "segunda_residencia", "inversion"], {
    errorMap: () => ({ message: "Selecciona la finalidad de la compra" }),
  }),
  
  // Situação financeira
  ingresos_mensuales: z.number()
    .min(500, "Los ingresos mensuales deben ser al menos 500€"),
  
  situacion_laboral: z.enum(["empleado", "autonomo", "pensionista", "desempleado", "inversor"], {
    errorMap: () => ({ message: "Selecciona una situación laboral válida" }),
  }),
  
  tiene_credito_vigente: z.boolean(),
  
  deudas_actuales: z.number()
    .min(0, "Las deudas no pueden ser negativas")
    .optional(),
  
  entrada_disponible: z.number()
    .min(0, "La entrada no puede ser negativa")
    .optional()
    .default(0),
  
  en_fichero_morosidad: z.boolean(),
  
  // Compra
  compra_solo_acompanado: z.enum(["solo", "acompanado"], {
    errorMap: () => ({ message: "Selecciona una opción válida" }),
  }),
  
  acompanante_nombre: z.string()
    .trim()
    .optional(),
  
  acompanante_relacion: z.string()
    .trim()
    .optional(),
  
  acompanante_aporte: z.number()
    .min(0, "El aporte no puede ser negativo")
    .optional(),
  
  // Privacidad
  acepta_privacidad: z.boolean()
    .refine((val) => val === true, {
      message: "Debes aceptar la política de privacidad para continuar",
    }),
}).refine(
  (data) => {
    // Se tem crédito vigente, deudas_actuales deve ser maior que 0
    if (data.tiene_credito_vigente && (!data.deudas_actuales || data.deudas_actuales <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Debes indicar cuánto pagas mensualmente de crédito vigente",
    path: ["deudas_actuales"],
  }
).refine(
  (data) => {
    // Se compra acompanado, os 3 campos devem estar preenchidos
    if (data.compra_solo_acompanado === "acompanado") {
      return (
        data.acompanante_nombre &&
        data.acompanante_nombre.length >= 3 &&
        data.acompanante_relacion &&
        data.acompanante_relacion.length >= 2 &&
        data.acompanante_aporte !== undefined &&
        data.acompanante_aporte > 0
      );
    }
    return true;
  },
  {
    message: "Completa todos los campos del acompañante",
    path: ["acompanante_nombre"],
  }
);

export type FormularioQualificacionData = z.infer<typeof formularioQualificacionSchema>;