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
        nombreCompleto: lead.nombre_completo,
        edad: 30,
        tipoDocumento: 'dni' as const,
        numeroTitulares: '1' as const,
        numeroPagas: 12,
        cobraBonusAnual: false,
        valorBonusAnual: 0,
        esResidenteFiscalEspana: true,
        precioVivienda: lead.valor_inmueble_deseado,
        comunidadAutonoma: 'Comunidad de Madrid' as const,
        familiaNumerosa: false,
        menorDe35: false,
        finalidadCompra: 'vivienda_habitual' as const,
        tienePropiedades: false,
        situacionLaboral: 'empleado' as const,
        tipoContrato: 'indefinido' as const,
        antiguedadEmpresaAnios: 2,
        antiguedadEmpresaMeses: 0,
        antiguedadContinuadaAnios: 2,
        antiguedadContinuadaMeses: 0,
        ingresosMensuales: 2000,
        ahorrosDisponibles: lead.valor_inmueble_deseado * 0.2,
        plazoHipotecaAnios: 25,
        tieneCreditos: false,
        estadoCivil: 'soltero' as const,
        tieneHijos: false,
      };
      const resultados = calcularSimulacionHipoteca(datosHipoteca);
      simuladorHipotecaDisplay = {
        valorInmueble: lead.valor_inmueble_deseado,
        cuotaMensual: resultados.cuotaMensual,
        montoMaximoCredito: resultados.montoFinanciable,
        capitalPropioNecesario: resultados.capitalPropioNecesario,
        porcentajeFinanciamiento: 80,
        tasaInteres: 2.5,
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

    // Função para adicionar logo no topo de cada página
    const addPageHeader = (yPosition: number = margin) => {
      const logoWidth = 30;
      const logoHeight = 30;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logo, 'PNG', logoX, yPosition, logoWidth, logoHeight);
      return yPosition + logoHeight + 10;
    };

    // Logo centralizada
    currentY = addPageHeader(currentY);

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
      currentY += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Sistema de amortización francés (cuota fija)', margin, currentY);
      currentY += 8;
      doc.setTextColor(0, 0, 0);

      // TABLA 1: Condiciones del Préstamo
      autoTable(doc, {
        startY: currentY,
        head: [['CONDICIONES DEL PRÉSTAMO', 'VALOR']],
        body: [
          ['Monto solicitado', formatEuro(simuladorPersonalDisplay.montoSolicitado)],
          ['Plazo del préstamo', `${simuladorPersonalDisplay.plazoMeses} meses (${(simuladorPersonalDisplay.plazoMeses / 12).toFixed(1)} años)`],
          ['Tasa de interés anual', `${simuladorPersonalDisplay.tasaInteres}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 90 },
          1: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // TABLA 2: Resumen Financiero
      autoTable(doc, {
        startY: currentY,
        head: [['RESUMEN FINANCIERO', 'VALOR']],
        body: [
          ['💰 Cuota mensual', formatEuro(simuladorPersonalDisplay.cuotaMensual)],
          ['📊 Total de intereses', formatEuro(simuladorPersonalDisplay.totalIntereses)],
          ['📝 Monto total a pagar', formatEuro(simuladorPersonalDisplay.totalPagar)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold', fontSize: 10 },
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
        currentY = addPageHeader(margin);
      }

      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('SIMULACIÓN DE CRÉDITO HIPOTECARIO', margin, currentY);
      currentY += 8;

      // TABLA 1: Datos de la Vivienda
      autoTable(doc, {
        startY: currentY,
        head: [['DATOS DE LA VIVIENDA', 'VALOR']],
        body: [
          ['Precio de la vivienda', formatEuro(simuladorHipotecaDisplay.valorInmueble)],
          ['Porcentaje de financiamiento', `${simuladorHipotecaDisplay.porcentajeFinanciamiento || 80}%`],
          ['Monto a financiar', formatEuro(simuladorHipotecaDisplay.montoFinanciable)],
          ['Capital propio necesario', formatEuro(simuladorHipotecaDisplay.capitalPropioNecesario)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 90 },
          1: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // TABLA 2: Condiciones Financieras
      const relacionCuotaIngreso = simuladorHipotecaDisplay.relacionCuotaIngreso || 0.35;
      autoTable(doc, {
        startY: currentY,
        head: [['CONDICIONES FINANCIERAS', 'VALOR']],
        body: [
          ['Tasa de interés anual', `${simuladorHipotecaDisplay.tasaInteres || 3.5}% (fijo)`],
          ['Plazo máximo', `${simuladorHipotecaDisplay.plazoAnios || 25} años`],
          ['⭐ Cuota mensual', formatEuro(simuladorHipotecaDisplay.cuotaMensual)],
          ['Capacidad de endeudamiento', `${(relacionCuotaIngreso * 100).toFixed(1)}% de ingresos`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold', fontSize: 10 },
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
        currentY = addPageHeader(margin);
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
        columnStyles: {
          0: { cellWidth: 25, textColor: [0, 102, 204], fontStyle: 'bold' },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          // Tornar coluna "Código" clicável
          if (data.column.index === 0 && data.cell.section === 'body') {
            const inmueble = inmuebles[data.row.index];
            const productUrl = `https://inventariotuhogarposible.vercel.app/produto/${inmueble.id}`;
            
            doc.link(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              { url: productUrl }
            );
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // NOTAS
    if (lead.notas) {
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = addPageHeader(margin);
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
      currentY = addPageHeader(margin);
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
