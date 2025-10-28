import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { Lead, STAGE_LABELS } from '@/types/crm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calcularAmortizacionFrancesa, calcularSimulacionHipoteca, formatEuro, formatDateTime } from './simuladorUtils';
import logo from '@/assets/logo.png';

export async function generateLeadCompletePDF(lead: Lead) {
  try {
    // Buscar inmuebles vinculados
    const { data: leadInmuebles } = await supabase
      .from('lead_inmuebles')
      .select('inmueble:inmuebles(*)')
      .eq('lead_id', lead.id);

    const inmuebles = leadInmuebles?.map(li => (li as any).inmueble).filter(Boolean) || [];

    // Buscar histórico
    const { data: historico } = await supabase
      .from('lead_historico')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    // Calcular simulaciones se não existirem (apenas para exibição no PDF)
    let simuladorPersonalDisplay = lead.simulador_personal_data;
    let simuladorHipotecaDisplay = lead.simulador_hipotecario_data;
    let wasCalculatedAutomatically = false;

    if (!simuladorPersonalDisplay && lead.valor_inmueble_deseado) {
      const datosPersonal = {
        valorInmueble: lead.valor_inmueble_deseado,
        entrada: 0,
        plazoMeses: 120,
        tasaAnual: 6.5,
        ingresos: 2000,
        deudas: 0,
      };
      const resultados = calcularAmortizacionFrancesa(datosPersonal);
      simuladorPersonalDisplay = {
        montoSolicitado: resultados.montoFinanciar,
        cuotaMensual: resultados.cuotaMensual,
        totalIntereses: resultados.totalIntereses,
        totalPagar: resultados.montoTotalPagar,
        plazoMeses: 120,
        tasaInteres: 6.5,
        cualificado: resultados.cualificado,
      } as any;
      wasCalculatedAutomatically = true;
    }

    if (!simuladorHipotecaDisplay && lead.valor_inmueble_deseado) {
      const datosHipoteca = {
        precioVivienda: lead.valor_inmueble_deseado,
        comunidadAutonoma: 'Madrid' as const,
        familiaNumerosa: false,
        menorDe35: false,
        situacionLaboral: 'empleado' as const,
        ingresosMensuales: 2000,
        creditosPendientes: 0,
        edad: 30,
        tasaAnual: 3.5,
        porcentajeFinanciamiento: 80,
      };
      const resultados = calcularSimulacionHipoteca(datosHipoteca);
      simuladorHipotecaDisplay = {
        valorInmueble: lead.valor_inmueble_deseado,
        cuotaMensual: resultados.cuotaMensual,
        montoMaximoCredito: resultados.montoFinanciable,
        capitalPropioNecesario: resultados.capitalPropioNecesario,
        porcentajeFinanciamiento: 80,
        tasaInteres: 3.5,
        plazoAnios: resultados.plazoMaximoAnios,
        plazoMeses: resultados.plazoMaximoMeses,
        aprobable: resultados.aprobable,
      } as any;
      wasCalculatedAutomatically = true;
    }

    // Iniciar PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Logo e título
    doc.addImage(logo, 'PNG', margin, currentY, 15, 15);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 98, 255);
    doc.text('TU HOGAR POSIBLE', margin + 20, currentY + 10);
    currentY += 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('FICHA COMPLETA DE LEAD', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${formatDateTime()}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    // DATOS DEL LEAD
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DATOS DEL LEAD', margin, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${lead.nombre_completo}`, margin, currentY);
    currentY += 6;
    doc.text(`Email: ${lead.email}`, margin, currentY);
    currentY += 6;
    doc.text(`Teléfono: ${lead.telefono}`, margin, currentY);
    currentY += 6;
    
    if (lead.ciudad_interes) {
      doc.text(`Ciudad de interés: ${lead.ciudad_interes}`, margin, currentY);
      currentY += 6;
    }
    
    if (lead.zona_interes) {
      doc.text(`Zona de interés: ${lead.zona_interes}`, margin, currentY);
      currentY += 6;
    }
    
    if (lead.valor_inmueble_deseado) {
      doc.text(`Valor inmueble deseado: ${formatEuro(lead.valor_inmueble_deseado)}`, margin, currentY);
      currentY += 6;
    }

    doc.text(`Etapa actual: ${STAGE_LABELS[lead.stage]}`, margin, currentY);
    currentY += 6;
    doc.text(`Fuente: ${lead.source === 'formulario_web' ? 'Formulario Web' : 'Manual'}`, margin, currentY);
    currentY += 6;
    doc.text(`Fecha creación: ${format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, currentY);
    currentY += 12;

    // SIMULACIÓN PERSONAL
    if (simuladorPersonalDisplay) {
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SIMULACIÓN DE CRÉDITO PERSONAL', margin, currentY);
      currentY += 10;

      autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Valor']],
        body: [
          ['Monto solicitado', formatEuro(simuladorPersonalDisplay.montoSolicitado)],
          ['Cuota mensual', formatEuro(simuladorPersonalDisplay.cuotaMensual)],
          ['Total intereses', formatEuro(simuladorPersonalDisplay.totalIntereses)],
          ['Monto total a pagar', formatEuro(simuladorPersonalDisplay.totalPagar)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 90 },
          1: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // SIMULACIÓN HIPOTECARIA
    if (simuladorHipotecaDisplay) {
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin;
      }

      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SIMULACIÓN DE CRÉDITO HIPOTECARIO', margin, currentY);
      currentY += 10;

      autoTable(doc, {
        startY: currentY,
        head: [['Concepto', 'Valor']],
        body: [
          ['Valor inmueble', formatEuro(simuladorHipotecaDisplay.valorInmueble)],
          ['Monto máximo crédito', formatEuro(simuladorHipotecaDisplay.montoMaximoCredito)],
          ['Cuota mensual', formatEuro(simuladorHipotecaDisplay.cuotaMensual)],
          ['Capital propio necesario', formatEuro(simuladorHipotecaDisplay.capitalPropioNecesario)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 90 },
          1: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // INMUEBLES VINCULADOS
    if (inmuebles.length > 0) {
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin;
      }

      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`INMUEBLES VINCULADOS (${inmuebles.length})`, margin, currentY);
      currentY += 10;

      const inmueblesData = inmuebles.map((inm: any) => [
        inm.codigo_inventario || inm.id.slice(0, 8),
        inm.tipo,
        formatEuro(Number(inm.precio)),
        `${inm.ciudad}, ${inm.region}`,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Código', 'Tipo', 'Precio', 'Ubicación']],
        body: inmueblesData,
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // HISTORIAL DE ETAPAS
    if (historico && historico.length > 0) {
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin;
      }

      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('HISTORIAL DE ETAPAS', margin, currentY);
      currentY += 10;

      const historicoData = historico.map(h => [
        format(new Date(h.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
        h.stage_anterior ? STAGE_LABELS[h.stage_anterior] : 'Inicio',
        STAGE_LABELS[h.stage_nuevo],
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Fecha', 'Etapa Anterior', 'Nueva Etapa']],
        body: historicoData,
        theme: 'grid',
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // NOTAS
    if (lead.notas) {
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = margin;
      }

      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTAS', margin, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const notasSplit = doc.splitTextToSize(lead.notas, pageWidth - 2 * margin);
      doc.text(notasSplit, margin, currentY);
      currentY += (notasSplit.length * 6) + 10;
    }

    // DISCLAIMER
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }

    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);

    const disclaimerText = wasCalculatedAutomatically
      ? 'NOTA: Las simulaciones mostradas fueron calculadas con valores predeterminados para referencia. ' +
        'Para una evaluación precisa, complete los simuladores con los datos reales del lead. ' +
        'Este documento es confidencial y de uso interno.'
      : 'Este documento es confidencial y de uso interno. Los valores mostrados son resultado de simulaciones ' +
        'basadas en los datos proporcionados por el lead.';

    const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
    doc.text(splitDisclaimer, margin, currentY);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Documento generado el ${formatDateTime()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Salvar
    const fileName = `Lead_Completo_${lead.nombre_completo.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error('[generateLeadCompletePDF] Error:', error);
    throw error;
  }
}
