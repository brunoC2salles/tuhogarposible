import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatEuro, formatDateTime, type ResultadosSimulacion, calcularAmortizacionFrancesa, calcularSimulacionHipoteca, type DatosSimulacion, type DatosSimulacionHipoteca } from './simuladorUtils';
import { type SimuladorCreditoFormData } from '@/schemas/simuladorSchema';
import { supabase } from '@/integrations/supabase/client';
import { Lead, STAGE_LABELS } from '@/types/crm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logo from '@/assets/logo.png';

export function generateSimulacionPDF(
  datos: SimuladorCreditoFormData,
  resultados: ResultadosSimulacion
) {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = (pageWidth - logoWidth) / 2;
  doc.addImage(logo, 'PNG', logoX, currentY, logoWidth, logoHeight);
  currentY += logoHeight + 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SIMULACIÓN DE CRÉDITO PERSONAL', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${formatDateTime()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DATOS DEL CLIENTE', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${datos.nombreCompleto}`, margin, currentY);
  currentY += 6;
  doc.text(`Edad: ${datos.edad} años`, margin, currentY);
  currentY += 6;
  doc.text(`Ingresos mensuales: ${formatEuro(datos.ingresosMensuales)}`, margin, currentY);
  currentY += 6;
  doc.text(`Deudas actuales: ${formatEuro(datos.deudasActuales)}`, margin, currentY);
  currentY += 12;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDICIONES DEL PRÉSTAMO', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Valor del inmueble: ${formatEuro(datos.valorInmueble)}`, margin, currentY);
  currentY += 6;
  doc.text(`Entrada: ${formatEuro(datos.entrada)}`, margin, currentY);
  currentY += 6;
  
  const plazoAnios = Math.floor(datos.plazoMeses / 12);
  const plazoMesesRestantes = datos.plazoMeses % 12;
  const plazoTexto = plazoMesesRestantes > 0 
    ? `${plazoAnios} años y ${plazoMesesRestantes} meses` 
    : `${plazoAnios} años`;
  
  doc.text(`Plazo: ${datos.plazoMeses} meses (${plazoTexto})`, margin, currentY);
  currentY += 6;
  doc.text(`Tasa de interés: ${datos.tasaAnual}% anual`, margin, currentY);
  currentY += 12;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS DE LA SIMULACIÓN', margin, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: [
      ['Máximo de Crédito Personal', formatEuro(resultados.montoMaximoCredito)],
      ['Cantidad solicitada', formatEuro(resultados.montoFinanciar)],
      ['Cuota mensual', formatEuro(resultados.cuotaMensual)],
      ['Total de intereses', formatEuro(resultados.totalIntereses)],
      ['Monto total a pagar', formatEuro(resultados.montoTotalPagar)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right', cellWidth: 'auto' } },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (!resultados.cualificado) {
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ CANDIDATO NO CUALIFICADO', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  } else {
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ CANDIDATO CUALIFICADO', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  }

  currentY += 5;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('✓ POLÍTICA DE PRIVACIDAD', margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('El usuario ha aceptado la Política de Privacidad y el tratamiento de sus datos conforme al RGPD.', margin, currentY);
  currentY += 10;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const disclaimerText = 
    'Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos y sujetos a aprobación crediticia. ' +
    'Esta simulación no constituye una oferta vinculante. Para información oficial, consulte con nuestros asesores.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
  doc.text(splitDisclaimer, margin, currentY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documento generado el ${formatDateTime()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  const fileName = `Simulacion_${datos.nombreCompleto.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

// ========== SIMULADOR HIPOTECARIO ==========

export function generateSimulacionHipotecariaPDF(
  datos: any,
  resultados: any
) {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = (pageWidth - logoWidth) / 2;
  doc.addImage(logo, 'PNG', logoX, currentY, logoWidth, logoHeight);
  currentY += logoHeight + 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SIMULACIÓN DE CRÉDITO HIPOTECARIO', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${formatDateTime()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DATOS DEL CLIENTE', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${datos.nombreCompleto}`, margin, currentY);
  currentY += 6;
  doc.text(`Edad: ${datos.edad} años`, margin, currentY);
  currentY += 6;
  doc.text(`Situación laboral: ${datos.situacionLaboral === 'autonomo' ? 'Autónomo' : 'Empleado'}`, margin, currentY);
  currentY += 6;
  doc.text(`Ingresos mensuales: ${formatEuro(datos.ingresosMensuales)}`, margin, currentY);
  currentY += 6;
  doc.text(`Créditos pendientes: ${formatEuro(datos.creditosPendientes)}`, margin, currentY);
  currentY += 12;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA VIVIENDA', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Precio de la vivienda: ${formatEuro(datos.precioVivienda)}`, margin, currentY);
  currentY += 6;
  doc.text(`Porcentaje de financiamiento: ${datos.porcentajeFinanciamiento}%`, margin, currentY);
  currentY += 6;
  doc.text(`Comunidad autónoma: ${datos.comunidadAutonoma}`, margin, currentY);
  currentY += 6;
  doc.text(`Familia numerosa: ${datos.familiaNumerosa ? 'Sí (50% descuento)' : 'No'}`, margin, currentY);
  currentY += 6;
  doc.text(`Menor de 35 años: ${datos.menorDe35 ? 'Sí (10% descuento adicional)' : 'No'}`, margin, currentY);
  currentY += 6;
  doc.text(`Gastos e impuestos: ${formatEuro(resultados.gastosImpuestos)}`, margin, currentY);
  currentY += 12;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDICIONES FINANCIERAS', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const plazoTexto = resultados.plazoMaximoMeses % 12 === 0 
    ? `${resultados.plazoMaximoAnios} años`
    : `${Math.floor(resultados.plazoMaximoAnios)} años y ${resultados.plazoMaximoMeses % 12} meses`;
  
  doc.text(`Plazo máximo: ${resultados.plazoMaximoMeses} meses (${plazoTexto})`, margin, currentY);
  currentY += 6;
  doc.text(`Tasa de interés: ${datos.tasaAnual}% anual`, margin, currentY);
  currentY += 6;
  doc.text(`Hipoteca máxima mensual: ${formatEuro(resultados.hipotecaMaximaMensual)}`, margin, currentY);
  currentY += 12;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS DE LA SIMULACIÓN', margin, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: [
      [`Monto a financiar (${datos.porcentajeFinanciamiento}%)`, formatEuro(resultados.montoFinanciable)],
      [`Capital propio necesario (${100 - datos.porcentajeFinanciamiento}% + gastos)`, formatEuro(resultados.capitalPropioNecesario)],
      ['Cuota mensual', formatEuro(resultados.cuotaMensual)],
      ['Total de intereses', formatEuro(resultados.totalIntereses)],
      ['Monto total a pagar', formatEuro(resultados.montoTotalPagar)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right', cellWidth: 'auto' } },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  if (resultados.aprobable) {
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ HIPOTECA APROBABLE', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  } else {
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✗ HIPOTECA NO APROBABLE', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  }

  currentY += 5;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('✓ POLÍTICA DE PRIVACIDAD', margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('El usuario ha aceptado la Política de Privacidad y el tratamiento de sus datos conforme al RGPD.', margin, currentY);
  currentY += 10;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const disclaimerText = 
    'Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos y sujetos a aprobación crediticia. ' +
    'El plazo máximo depende de la edad del solicitante. Los gastos e impuestos varían según la comunidad autónoma. ' +
    'Esta simulación no constituye una oferta vinculante. Para información oficial, consulte con nuestros asesores.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
  doc.text(splitDisclaimer, margin, currentY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documento generado el ${formatDateTime()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  const fileName = `Simulacion_Hipoteca_${datos.nombreCompleto.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

// ========== SIMULADOR COMBINADO (now mortgage-only) ==========

export function generateSimulacionCombinadaPDF(
  datos: any,
  resultadosHipoteca: any
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // Logo
  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = (pageWidth - logoWidth) / 2;
  doc.addImage(logo, 'PNG', logoX, currentY, logoWidth, logoHeight);
  currentY += logoHeight + 10;

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SIMULACIÓN HIPOTECARIA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${formatDateTime()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // DATOS DEL CLIENTE
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DATOS DEL CLIENTE', margin, currentY);
  currentY += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${datos.nombreCompleto}`, margin, currentY);
  currentY += 5;
  doc.text(`Edad: ${datos.edad} años`, margin, currentY);
  currentY += 5;
  doc.text(`Ingresos mensuales: ${formatEuro(datos.ingresosMensuales)}`, margin, currentY);
  currentY += 5;
  doc.text(`Ahorros disponibles: ${formatEuro(datos.ahorrosDisponibles || 0)}`, margin, currentY);
  currentY += 10;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // ===== CRÉDITO HIPOTECARIO =====
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(15, 118, 110);
  doc.rect(margin, currentY - 1, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('CRÉDITO HIPOTECARIO', margin + 2, currentY + 5);
  doc.setTextColor(0, 0, 0);
  currentY += 14;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Precio de la vivienda: ${formatEuro(datos.precioVivienda)}`, margin, currentY);
  currentY += 5;
  doc.text(`Gastos e impuestos: ${formatEuro(resultadosHipoteca.gastosImpuestos)}`, margin, currentY);
  currentY += 5;
  doc.text(`Comunidad autónoma: ${datos.comunidadAutonoma}`, margin, currentY);
  currentY += 5;

  const plazoHTexto = resultadosHipoteca.plazoMaximoMeses % 12 === 0
    ? `${resultadosHipoteca.plazoMaximoAnios} años`
    : `${Math.floor(resultadosHipoteca.plazoMaximoAnios)} años y ${resultadosHipoteca.plazoMaximoMeses % 12} meses`;
  doc.text(`Plazo máximo: ${resultadosHipoteca.plazoMaximoMeses} meses (${plazoHTexto})`, margin, currentY);
  currentY += 8;

  // Precio máximo: usar el nuevo cálculo (Punto 1 + Punto 2) cuando exista, fallback al previo
  const pct = resultadosHipoteca.porcentajeFinanciamiento || 80;
  const pctDec = pct / 100;
  const precioMaxHipoteca = pctDec > 0 ? resultadosHipoteca.montoMaximoFinanciable / pctDec : 0;
  const precioMax = (typeof resultadosHipoteca.precioMaximoInmueble === 'number' && resultadosHipoteca.precioMaximoInmueble > 0)
    ? resultadosHipoteca.precioMaximoInmueble
    : Math.max(0, precioMaxHipoteca);

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: [
      [`Monto a financiar (${pct.toFixed(0)}%)`, formatEuro(resultadosHipoteca.montoFinanciable)],
      ['Capital propio necesario', formatEuro(resultadosHipoteca.capitalPropioNecesario)],
      ['Cuota mensual', formatEuro(resultadosHipoteca.cuotaMensual)],
      ['Hipoteca máxima financiable', formatEuro(resultadosHipoteca.montoMaximoFinanciable)],
      ['Precio máximo de vivienda*', formatEuro(precioMax)],
      ['Total de intereses', formatEuro(resultadosHipoteca.totalIntereses)],
      ['Monto total a pagar', formatEuro(resultadosHipoteca.montoTotalPagar)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right', cellWidth: 'auto' } },
    margin: { left: margin, right: margin }
  });
  currentY = (doc as any).lastAutoTable.finalY + 5;

  // TIN/TAE disclosure
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('TIN 1,6% (primeros 10 años) · TAE 1,72% - Euribor + 0,35% (resto de años)', margin, currentY);
  currentY += 4;
  doc.text('*Precio máximo basado en la hipoteca máxima financiable', margin, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 6;

  // Capital gap
  const capitalFaltante = Math.max(0, resultadosHipoteca.capitalPropioNecesario - (datos.ahorrosDisponibles || 0));
  if (capitalFaltante > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 100, 0);
    doc.text(`Valor a completar con otros recursos (ahorros, crédito personal): ${formatEuro(capitalFaltante)}`, margin, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 8;
  }

  // Approval badge
  if (resultadosHipoteca.aprobable) {
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ HIPOTECA APROBABLE', pageWidth / 2, currentY + 6, { align: 'center' });
  } else {
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✗ HIPOTECA NO APROBABLE', pageWidth / 2, currentY + 6, { align: 'center' });
  }
  doc.setTextColor(0, 0, 0);
  currentY += 14;

  // RGPD
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('✓ POLÍTICA DE PRIVACIDAD ACEPTADA (RGPD)', margin, currentY);
  currentY += 10;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Disclaimer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const disclaimerText = 'Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos y sujetos a aprobación crediticia. Esta simulación no constituye una oferta vinculante.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
  doc.text(splitDisclaimer, margin, currentY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documento generado el ${formatDateTime()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  const fileName = `Simulacion_Hipotecaria_${datos.nombreCompleto.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
