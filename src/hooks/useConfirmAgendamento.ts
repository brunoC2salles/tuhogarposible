import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { FormularioQualificacionData } from "@/schemas/formularioQualificacionSchema";
import type { QualificacionResult } from "@/lib/qualificacaoUtils";
import { 
  calcularAmortizacionFrancesa, 
  calcularSimulacionHipoteca,
  type DatosSimulacion,
  type DatosSimulacionHipoteca
} from "@/lib/simuladorUtils";

interface AgenteData {
  id: string;
  nombre: string;
  telefono: string;
  tidycal_url: string;
}

export function useConfirmAgendamento() {
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmAgendamento = async (
    formData: FormularioQualificacionData,
    qualificacaoResult: QualificacionResult,
    agente: AgenteData
  ) => {
    setIsConfirming(true);
    
    try {
      // VALIDACIONES PREVIAS
    if (!formData.valor_inmueble_deseado || formData.valor_inmueble_deseado < 10000) {
      throw new Error('El valor del inmueble debe ser al menos 10.000€');
    }

      if (!formData.ingresos_mensuales || formData.ingresos_mensuales < 500) {
        throw new Error('Los ingresos mensuales deben ser al menos 500€');
      }

      // Calcular menor_de_35
      const menorDe35 = formData.edad < 35;

      // 1. CALCULAR SIMULAÇÃO DE CRÉDITO PESSOAL
      let resultadosPersonal;
      let datosSimulacionPersonal: DatosSimulacion;
      
      try {
        datosSimulacionPersonal = {
          ingresos: formData.ingresos_mensuales,
          deudas: formData.deudas_actuales || 0,
          entrada: formData.entrada_disponible || 0,
          valorInmueble: formData.valor_inmueble_deseado,
          plazoMeses: 96,
          tasaAnual: 6,
        };

        resultadosPersonal = calcularAmortizacionFrancesa(datosSimulacionPersonal);
      } catch (error) {
        console.error('Error en simulación personal:', error);
        throw new Error('Error al calcular simulación de crédito personal');
      }

      // 2. CALCULAR SIMULAÇÃO HIPOTECÁRIA
      let resultadosHipoteca;
      let datosSimulacionHipoteca: DatosSimulacionHipoteca;
      
      try {
        const situacionLaboralNormalizada = 
          formData.situacion_laboral === "pensionista" ? "empleado" :
          formData.situacion_laboral === "desempleado" ? "empleado" :
          formData.situacion_laboral as "autonomo" | "empleado";

        const comunidadNormalizada = 
          formData.comunidad_autonoma === "Comunidad de Madrid" ? "Madrid" :
          formData.comunidad_autonoma === "Cataluña" ? "Cataluña" :
          formData.comunidad_autonoma === "Andalucía" ? "Andalucía" :
          formData.comunidad_autonoma === "Comunidad Valenciana" ? "Valencia" :
          "Otros" as const;

        datosSimulacionHipoteca = {
          nombreCompleto: formData.nombre_completo,
          edad: formData.edad,
          numeroTitulares: '1',
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
          estadoCivil: 'soltero',
          tieneHijos: false
        };

        resultadosHipoteca = calcularSimulacionHipoteca(datosSimulacionHipoteca);
      } catch (error) {
        console.error('Error en simulación hipotecaria:', error);
        throw new Error('Error al calcular simulación hipotecaria');
      }

      // 3. SALVAR NO BANCO
      let data;
      try {
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
          
          // Simulações
          menor_de_35: menorDe35,
          familia_numerosa: false,
          simulador_personal_data: resultadosPersonal as any,
          simulador_hipotecario_data: resultadosHipoteca as any,
          
          // Agente
          agente_asignado_id: agente.id,
          
          // Privacidade
          acepta_privacidad: formData.acepta_privacidad,
          
          // Tidycal
          tidycal_link: agente.tidycal_url,
          tidycal_scheduled: true, // Usuário confirmou que agendou
          tidycal_booking_id: null, // Não temos acesso
          
          // Status
          processed: false,
          lead_id: null,
        };

        const result = await supabase
          .from("form_submissions")
          .insert([submissionData])
          .select()
          .single();

        if (result.error) {
          console.error("Error submitting form:", result.error);
          throw new Error(`Error al guardar los datos: ${result.error.message}`);
        }
        
        data = result.data;
        console.log('[ConfirmAgendamento] Submission criado:', data.id, 'Lead ID:', data.lead_id);
      } catch (error) {
        console.error('Error en guardado de datos:', error);
        throw new Error('Error al guardar los datos en la base de datos');
      }

      // 4. DISPARAR WEBHOOK COM PAYLOAD FLAT
      try {
        // Buscar URL do webhook
        const { data: webhookConfig } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'webhook_makecom_url')
          .maybeSingle();

        const webhookUrl = webhookConfig?.value;

        if (webhookUrl && webhookUrl.trim() !== '') {
          // ========================================
          // PAYLOAD 100% FLAT (OPÇÃO A)
          // ========================================
          const webhookPayload = {
            // IDs
            submission_id: data.id,
            lead_id: data.lead_id,
            timestamp: new Date().toISOString(),
            
            // Lead (flat)
            lead_nombre_completo: formData.nombre_completo,
            lead_email: formData.email,
            lead_telefono: formData.telefono,
            lead_edad: formData.edad,
            lead_ciudad_interes: formData.ciudad_interes,
            lead_comunidad_autonoma: formData.comunidad_autonoma,
            lead_valor_inmueble_deseado: formData.valor_inmueble_deseado,
            
            // Financeiro (flat)
            financeiro_entrada_disponible: formData.entrada_disponible || 0,
            financeiro_ingresos_mensuales: formData.ingresos_mensuales,
            financeiro_deudas_actuales: formData.deudas_actuales || 0,
            financeiro_situacion_laboral: formData.situacion_laboral,
            financeiro_en_fichero_morosidad: formData.en_fichero_morosidad,
            
            // Acompanante (flat, null se solo)
            acompanante_nombre: formData.acompanante_nombre || null,
            acompanante_relacion: formData.acompanante_relacion || null,
            acompanante_aporte: formData.acompanante_aporte || null,
            
            // Agente (flat)
            agente_id: agente.id,
            agente_nombre: agente.nombre,
            agente_telefono: agente.telefono,
            agente_tidycal_url: agente.tidycal_url,
            
            // Simulação Crédito Personal (flat)
            simulacion_personal_monto_solicitado: resultadosPersonal.montoFinanciar,
            simulacion_personal_cuota_mensual: resultadosPersonal.cuotaMensual,
            simulacion_personal_total_pagar: resultadosPersonal.montoTotalPagar,
            simulacion_personal_total_intereses: resultadosPersonal.totalIntereses,
            simulacion_personal_plazo_meses: datosSimulacionPersonal.plazoMeses,
            simulacion_personal_tasa_anual: datosSimulacionPersonal.tasaAnual,
            simulacion_personal_aprobado: resultadosPersonal.cualificado,
            simulacion_personal_razon_rechazo: !resultadosPersonal.cualificado ? 'Capacidad de pago insuficiente' : null,
            
            // Simulação Crédito Hipotecario (flat)
            simulacion_hipoteca_valor_inmueble: datosSimulacionHipoteca.precioVivienda,
            simulacion_hipoteca_monto_maximo_credito: resultadosHipoteca.montoFinanciable,
            simulacion_hipoteca_cuota_mensual_estimada: resultadosHipoteca.cuotaMensual,
            simulacion_hipoteca_capital_propio_necesario: resultadosHipoteca.capitalPropioNecesario,
            simulacion_hipoteca_porcentaje_financiamiento: resultadosHipoteca.porcentajeFinanciamiento,
            simulacion_hipoteca_plazo_anos: resultadosHipoteca.plazoMaximoAnios,
            simulacion_hipoteca_tasa_anual: resultadosHipoteca.tasaAnualFija,
            simulacion_hipoteca_gastos_impuestos: resultadosHipoteca.gastosImpuestos,
            simulacion_hipoteca_aprobado: resultadosHipoteca.aprobable,
            simulacion_hipoteca_razon_rechazo: !resultadosHipoteca.aprobable ? 'Cuota mensual supera capacidad de pago' : null,
            
            // Agendamento (sem dados por não ter acesso ao Tidycal API)
            agendamento_data: null,
            agendamento_hora: null,
            agendamento_confirmado: true, // Usuário confirmou checkbox
          };

          // Disparar webhook
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(webhookPayload),
          });

          // Log de sucesso
          await supabase.from('webhook_logs').insert([{
            submission_id: data.id,
            webhook_url: webhookUrl,
            status: 'success',
            payload: webhookPayload as any,
          }]);

          console.log('[Webhook] Enviado com sucesso para Make.com (payload flat)');
        }
      } catch (webhookError: any) {
        console.error('[Webhook] Erro:', webhookError);
        
        // Log de erro (não bloquear fluxo)
        try {
          const { data: webhookConfig } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', 'webhook_makecom_url')
            .maybeSingle();

          await supabase.from('webhook_logs').insert([{
            submission_id: data.id,
            webhook_url: webhookConfig?.value || 'unknown',
            status: 'error',
            error_message: webhookError.message || 'Unknown error',
          }]);
        } catch (logError) {
          console.error('[Webhook] Erro ao salvar log:', logError);
        }
      }

      return {
        success: true,
        submission_id: data.id,
      };
    } catch (error) {
      console.error("Error in confirmAgendamento:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al procesar el formulario",
      };
    } finally {
      setIsConfirming(false);
    }
  };

  return {
    confirmAgendamento,
    isConfirming,
  };
}
