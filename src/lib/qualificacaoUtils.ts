import type { FormularioQualificacionData } from "@/schemas/formularioQualificacionSchema";

export interface QualificacionResult {
  qualificado: boolean;
  razon_no_qualificado?: string;
  ingresos_totales: number;
}

export function qualificarLead(formData: FormularioQualificacionData): QualificacionResult {
  // Calcular ingresos totales
  const ingresos_totales =
    formData.compra_solo_acompanado === "acompanado"
      ? formData.ingresos_mensuales + (formData.acompanante_aporte || 0)
      : formData.ingresos_mensuales;

  // Critério 1: Ingresos mensuales >= 1050€
  if (ingresos_totales < 1050) {
    return {
      qualificado: false,
      razon_no_qualificado: "Ingresos insuficientes (< 1050€)",
      ingresos_totales,
    };
  }

  // Critério 2: Idade < 55 anos
  if (formData.edad >= 55) {
    return {
      qualificado: false,
      razon_no_qualificado: "Edad superior al límite (>= 55 años)",
      ingresos_totales,
    };
  }

  // Critério 3: Situação laboral deve ser Empleado ou Autónomo
  if (
    formData.situacion_laboral !== "empleado" &&
    formData.situacion_laboral !== "autonomo"
  ) {
    return {
      qualificado: false,
      razon_no_qualificado: `Situación laboral no calificable (${formData.situacion_laboral})`,
      ingresos_totales,
    };
  }

  // Critério 4: Não pode estar em fichero de morosidad
  if (formData.en_fichero_morosidad) {
    return {
      qualificado: false,
      razon_no_qualificado: "En fichero de morosidad",
      ingresos_totales,
    };
  }

  // Critério 5: Se tem crédito vigente, deve ser < 30% dos ingresos
  if (formData.tiene_credito_vigente && formData.deudas_actuales) {
    const porcentaje_deuda = (formData.deudas_actuales / ingresos_totales) * 100;
    if (porcentaje_deuda >= 30) {
      return {
        qualificado: false,
        razon_no_qualificado: "Deuda vigente excede 30% de ingresos",
        ingresos_totales,
      };
    }
  }

  // Passou em todos os critérios
  return {
    qualificado: true,
    ingresos_totales,
  };
}
