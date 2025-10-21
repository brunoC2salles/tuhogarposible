import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { FormularioQualificacionData } from "@/schemas/formularioQualificacionSchema";
import type { QualificacionResult } from "@/lib/qualificacaoUtils";
import { toast } from "sonner";

export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFormulario = async (
    formData: FormularioQualificacionData,
    qualificacaoResult: QualificacionResult
  ) => {
    setIsSubmitting(true);
    
    try {
      // Determinar link do Tidycal baseado na comunidad autónoma
      const tidycal_link = formData.comunidad_autonoma === "Cataluña"
        ? "https://tidycal.com/team/cataluna/cataluna-primera-reunion"
        : "https://tidycal.com/team/general/general-primera-reunion";

      // Preparar dados para inserção
      const submissionData = {
        // Dados pessoais
        nombre_completo: formData.nombre_completo,
        email: formData.email,
        telefono: formData.telefono,
        edad: formData.edad,
        
        // Interesse imobiliário
        comunidad_autonoma: formData.comunidad_autonoma,
        ciudad_interes: formData.ciudad_interes,
        
        // Situação financeira
        ingresos_mensuales: formData.ingresos_mensuales,
        situacion_laboral: formData.situacion_laboral,
        deudas_actuales: formData.deudas_actuales || 0,
        en_fichero_morosidad: formData.en_fichero_morosidad,
        
        // Compra
        compra_solo_acompanado: formData.compra_solo_acompanado,
        acompanante_nombre: formData.acompanante_nombre || null,
        acompanante_relacion: formData.acompanante_relacion || null,
        acompanante_aporte: formData.acompanante_aporte || null,
        
        // Qualificação
        qualificado: qualificacaoResult.qualificado,
        razon_no_qualificado: qualificacaoResult.razon_no_qualificado || null,
        
        // Privacidade
        acepta_privacidad: formData.acepta_privacidad,
        
        // Tidycal
        tidycal_link,
        tidycal_scheduled: false,
        tidycal_booking_id: null,
        
        // Status de processamento
        processed: false,
        lead_id: null,
      };

      const { data, error } = await supabase
        .from("form_submissions")
        .insert(submissionData)
        .select()
        .single();

      if (error) {
        console.error("Error submitting form:", error);
        toast.error("Error al enviar el formulario. Por favor, inténtalo de nuevo.");
        throw error;
      }

      return {
        success: true,
        submission_id: data.id,
        tidycal_link,
      };
    } catch (error) {
      console.error("Error in submitFormulario:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitFormulario,
    isSubmitting,
  };
}
