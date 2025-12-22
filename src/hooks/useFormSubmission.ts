import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { FormularioQualificacionData } from "@/schemas/formularioQualificacionSchema";
import type { QualificacionResult } from "@/lib/qualificacaoUtils";
import { toast } from "sonner";
import { 
  calcularAmortizacionFrancesa, 
  calcularSimulacionHipoteca,
  type DatosSimulacion,
  type DatosSimulacionHipoteca
} from "@/lib/simuladorUtils";

export function useFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFormulario = async (
    formData: FormularioQualificacionData,
    qualificacaoResult: QualificacionResult
  ) => {
    setIsSubmitting(true);
    
    try {
      // Se qualificado, buscar agente via round-robin
      let agenteAsignado = null;
      let tidycalUrl = null;

      if (qualificacaoResult.qualificado) {
        const region = formData.comunidad_autonoma === "Cataluña" ? "Cataluña" : "General";
        
        try {
          const { data: agentData, error: agentError } = await supabase.functions.invoke(
            'get-next-agent',
            {
              body: { region }
            }
          );

          if (agentError) throw agentError;
          
          agenteAsignado = {
            id: agentData.agent_id,
            nombre: agentData.nombre,
            telefono: agentData.telefono
          };
          tidycalUrl = agentData.tidycal_url;
          
          console.log('[Formulario] Agente asignado:', agenteAsignado.nombre, 'Región:', region);
        } catch (error) {
          console.error('[Formulario] Error al asignar agente:', error);
          toast.error("Error al asignar agente. Por favor, inténtalo de nuevo.");
          throw error;
        }
      }

      // Calcular menor_de_35 automaticamente
      const menorDe35 = formData.edad < 35;

      // 1. SIMULAÇÃO DE CRÉDITO PESSOAL
      const datosSimulacionPersonal: DatosSimulacion = {
        ingresos: formData.ingresos_mensuales,
        deudas: formData.deudas_actuales || 0,
        entrada: formData.entrada_disponible || 0,
        valorInmueble: formData.valor_inmueble_deseado,
        plazoMeses: 96,
        tasaAnual: 6,
      };

      const resultadosPersonal = calcularAmortizacionFrancesa(datosSimulacionPersonal);

      // 2. SIMULAÇÃO HIPOTECÁRIA
      const situacionLaboralNormalizada = 
        formData.situacion_laboral === "pensionista" ? "empleado" :
        formData.situacion_laboral === "desempleado" ? "empleado" :
        formData.situacion_laboral as "autonomo" | "empleado";

      const comunidadNormalizada = 
        formData.comunidad_autonoma === "Comunidad de Madrid" ? "Comunidad de Madrid" :
        formData.comunidad_autonoma === "Cataluña" ? "Cataluña" :
        formData.comunidad_autonoma === "Andalucía" ? "Andalucía" :
        formData.comunidad_autonoma === "Comunidad Valenciana" ? "Comunidad Valenciana" :
        "Comunidad de Madrid" as const;

      const datosSimulacionHipoteca: DatosSimulacionHipoteca = {
        nombreCompleto: formData.nombre_completo,
        edad: formData.edad,
        numeroTitulares: '1',
        numeroPagas: 12,
        cobraBonusAnual: false,
        valorBonusAnual: 0,
        esResidenteFiscalEspana: true,
        precioVivienda: formData.valor_inmueble_deseado,
        comunidadAutonoma: comunidadNormalizada,
        familiaNumerosa: false,
        menorDe35: menorDe35,
        finalidadCompra: 'vivienda_habitual',
        tienePropiedades: false,
        situacionLaboral: situacionLaboralNormalizada,
        tipoContrato: 'indefinido',
        antiguedadEmpresaAnios: 2,
        antiguedadEmpresaMeses: 0,
        antiguedadContinuadaAnios: 2,
        antiguedadContinuadaMeses: 0,
        ingresosMensuales: formData.ingresos_mensuales,
        ahorrosDisponibles: formData.entrada_disponible || 0,
        plazoHipotecaAnios: 25,
        tieneCreditos: (formData.deudas_actuales || 0) > 0,
        creditos: (formData.deudas_actuales || 0) > 0 ? [{
          tipo: 'personal',
          cuotaMensual: formData.deudas_actuales || 0
        }] : [],
        estadoCivil: 'soltero'
      };

      const resultadosHipoteca = calcularSimulacionHipoteca(datosSimulacionHipoteca);

      console.log('[Simulaciones] Crédito Personal:', resultadosPersonal);
      console.log('[Simulaciones] Hipoteca:', resultadosHipoteca);

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
        valor_inmueble_deseado: formData.valor_inmueble_deseado,
        
        // Situação financeira
        entrada_disponible: formData.entrada_disponible || 0,
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
        
        // Simulações (calculadas automaticamente)
        menor_de_35: menorDe35,
        familia_numerosa: false,
        simulador_personal_data: resultadosPersonal as any,
        simulador_hipotecario_data: resultadosHipoteca as any,
        
        // Agente asignado (NOVO)
        agente_asignado_id: agenteAsignado?.id || null,
        
        // Privacidade
        acepta_privacidad: formData.acepta_privacidad,
        
        // Tidycal (não mais usado para scheduling, mas mantido por compatibilidade)
        tidycal_link: tidycalUrl || null,
        tidycal_scheduled: false,
        tidycal_booking_id: null,
        
        // Status de processamento
        processed: false,
        lead_id: null, // Será preenchido pelo trigger
      };

      const { data, error } = await supabase
        .from("form_submissions")
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        console.error("Error submitting form:", error);
        toast.error("Error al enviar el formulario. Por favor, inténtalo de nuevo.");
        throw error;
      }

      console.log('[Formulario] Submission creado:', data.id, 'Lead ID:', data.lead_id);

      // ========================================
      // DISPARAR WEBHOOK PARA MAKE.COM (se configurado)
      // ========================================
      if (qualificacaoResult.qualificado && agenteAsignado) {
        let webhookConfigValue = 'unknown';
        try {
          // Buscar URL do webhook
          const { data: webhookConfig } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'webhook_makecom_url')
            .single();

          const webhookUrl = webhookConfig?.value;
          webhookConfigValue = webhookUrl || 'unknown';

          if (webhookUrl && webhookUrl.trim() !== '') {
            // Preparar payload completo
            const webhookPayload = {
              submission_id: data.id,
              lead_id: data.lead_id,
              timestamp: new Date().toISOString(),
              
              lead: {
                nombre_completo: formData.nombre_completo,
                email: formData.email,
                telefono: formData.telefono,
                edad: formData.edad,
                ciudad_interes: formData.ciudad_interes,
                comunidad_autonoma: formData.comunidad_autonoma,
                valor_inmueble_deseado: formData.valor_inmueble_deseado,
              },
              
              financeiro: {
                entrada_disponible: formData.entrada_disponible || 0,
                ingresos_mensuales: formData.ingresos_mensuales,
                deudas_actuales: formData.deudas_actuales || 0,
                situacion_laboral: formData.situacion_laboral,
                en_fichero_morosidad: formData.en_fichero_morosidad,
              },
              
              acompanante: formData.compra_solo_acompanado === 'acompanado' ? {
                nombre: formData.acompanante_nombre,
                relacion: formData.acompanante_relacion,
                aporte: formData.acompanante_aporte,
              } : null,
              
              agente: {
                id: agenteAsignado.id,
                nombre: agenteAsignado.nombre,
                telefono: agenteAsignado.telefono,
                tidycal_url: tidycalUrl,
              },
              
              simulaciones: {
                credito_personal: resultadosPersonal,
                credito_hipotecario: resultadosHipoteca,
              },
            };

            // Disparar webhook (no-cors)
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              mode: 'no-cors',
              body: JSON.stringify(webhookPayload),
            });

            // Log de sucesso
            await supabase.from('webhook_logs').insert([{
              submission_id: data.id,
              webhook_url: webhookUrl,
              status: 'success',
              payload: webhookPayload as any,
            }]);

            console.log('[Webhook] Enviado com sucesso para Make.com');
          }
        } catch (webhookError: any) {
          console.error('[Webhook] Erro:', webhookError);
          
          // Log de erro (não bloquear fluxo)
          try {
            await supabase.from('webhook_logs').insert([{
              submission_id: data.id,
              webhook_url: webhookConfigValue,
              status: 'error',
              error_message: webhookError.message || 'Unknown error',
            }]);
          } catch (logError) {
            console.error('[Webhook] Erro ao salvar log:', logError);
          }
        }
      }

      return {
        success: true,
        submission_id: data.id,
        tidycal_url: tidycalUrl,
        nombre_agente: agenteAsignado?.nombre,
        telefono_agente: agenteAsignado?.telefono,
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
