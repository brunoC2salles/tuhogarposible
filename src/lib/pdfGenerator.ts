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
  
  // Configurações
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // Logo centralizada
  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = (pageWidth - logoWidth) / 2;
  doc.addImage(logo, 'PNG', logoX, currentY, logoWidth, logoHeight);
  currentY += logoHeight + 10;

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SIMULACIÓN DE CRÉDITO PERSONAL', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // Data e hora
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${formatDateTime()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // DADOS DO CLIENTE
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

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // CONDICIONES DEL PRÉSTAMO
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

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // RESULTADOS DE LA SIMULACIÓN
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS DE LA SIMULACIÓN', margin, currentY);
  currentY += 10;

  // Tabela de resultados
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
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Badge de cualificación
  if (!resultados.cualificado) {
    doc.setFillColor(220, 38, 38); // Vermelho
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ CANDIDATO NO CUALIFICADO', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  } else {
    doc.setFillColor(34, 197, 94); // Verde
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ CANDIDATO CUALIFICADO', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  }

  // Espaço antes do disclaimer
  currentY += 5;

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // RGPD Badge
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

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Disclaimer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  
  const disclaimerText = 
    'Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos y sujetos a aprobación crediticia. ' +
    'Esta simulación no constituye una oferta vinculante. Para información oficial, consulte con nuestros asesores.';
  
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
  doc.text(splitDisclaimer, margin, currentY);

  // Footer com data
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Documento generado el ${formatDateTime()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Salvar PDF
  const fileName = `Simulacion_${datos.nombreCompleto.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

// ========== SIMULADOR HIPOTECARIO ==========

export function generateSimulacionHipotecariaPDF(
  datos: any,
  resultados: any
) {
  const doc = new jsPDF();
  
  // Configurações
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  // Logo centralizada
  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = (pageWidth - logoWidth) / 2;
  doc.addImage(logo, 'PNG', logoX, currentY, logoWidth, logoHeight);
  currentY += logoHeight + 10;

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SIMULACIÓN DE CRÉDITO HIPOTECARIO', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  // Data e hora
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${formatDateTime()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // DADOS DO CLIENTE
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

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // DATOS DE LA VIVIENDA
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

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // CONDICIONES FINANCIERAS
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

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // RESULTADOS DE LA SIMULACIÓN
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS DE LA SIMULACIÓN', margin, currentY);
  currentY += 10;

  // Tabela de resultados
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
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Badge de aprobación
  if (resultados.aprobable) {
    doc.setFillColor(34, 197, 94); // Verde
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ HIPOTECA APROBABLE', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  } else {
    doc.setFillColor(220, 38, 38); // Vermelho
    doc.rect(margin, currentY, pageWidth - 2 * margin, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✗ HIPOTECA NO APROBABLE', pageWidth / 2, currentY + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    currentY += 15;
  }

  // Espaço antes do disclaimer
  currentY += 5;

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // RGPD Badge
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

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Disclaimer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  
  const disclaimerText = 
    'Cálculo realizado según las reglas de Tu Hogar Posible. Los valores son orientativos y sujetos a aprobación crediticia. ' +
    'El plazo máximo depende de la edad del solicitante. Los gastos e impuestos varían según la comunidad autónoma. ' +
    'Esta simulación no constituye una oferta vinculante. Para información oficial, consulte con nuestros asesores.';
  
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
  doc.text(splitDisclaimer, margin, currentY);

  // Footer com data
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Documento generado el ${formatDateTime()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Salvar PDF
  const fileName = `Simulacion_Hipoteca_${datos.nombreCompleto.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

// ========== SIMULADOR COMBINADO ==========

export function generateSimulacionCombinadaPDF(
  datos: any,
  resultadosPersonal: any,
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
  doc.text('SIMULACIÓN FINANCIERA COMBINADA', pageWidth / 2, currentY, { align: 'center' });
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
  currentY += 10;

  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // ===== SECCIÓN 1: CRÉDITO PERSONAL =====
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(41, 98, 255);
  doc.rect(margin, currentY - 1, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('CRÉDITO PERSONAL', margin + 2, currentY + 5);
  doc.setTextColor(0, 0, 0);
  currentY += 14;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Importe a financiar (capital propio necesario): ${formatEuro(datos.valorInmueble)}`, margin, currentY);
  currentY += 5;
  doc.text(`Entrada: ${formatEuro(datos.entrada)}`, margin, currentY);
  currentY += 5;

  const plazoAnios = Math.floor(datos.plazoMeses / 12);
  const plazoMesesR = datos.plazoMeses % 12;
  const plazoTextoP = plazoMesesR > 0 ? `${plazoAnios} años y ${plazoMesesR} meses` : `${plazoAnios} años`;
  doc.text(`Plazo: ${datos.plazoMeses} meses (${plazoTextoP})`, margin, currentY);
  currentY += 5;
  doc.text(`Tasa de interés: ${datos.tasaAnual}% anual`, margin, currentY);
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: [
      ['Máximo Crédito Personal (20% ingresos − deudas)', formatEuro(resultadosPersonal.montoMaximoCredito)],
      ['Cantidad solicitada', formatEuro(resultadosPersonal.montoFinanciar)],
      ['Cuota mensual', formatEuro(resultadosPersonal.cuotaMensual)],
      ['Total de intereses', formatEuro(resultadosPersonal.totalIntereses)],
      ['Monto total a pagar', formatEuro(resultadosPersonal.montoTotalPagar)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right', cellWidth: 'auto' } },
    margin: { left: margin, right: margin }
  });
  currentY = (doc as any).lastAutoTable.finalY + 5;

  if (resultadosPersonal.cualificado) {
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ CANDIDATO CUALIFICADO', pageWidth / 2, currentY + 6, { align: 'center' });
  } else {
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ CANDIDATO NO CUALIFICADO', pageWidth / 2, currentY + 6, { align: 'center' });
  }
  doc.setTextColor(0, 0, 0);
  currentY += 14;

  // ===== SECCIÓN 2: CRÉDITO HIPOTECARIO =====
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

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: [
      [`Monto a financiar (${resultadosHipoteca.porcentajeFinanciamiento?.toFixed(0)}%)`, formatEuro(resultadosHipoteca.montoFinanciable)],
      ['Capital propio necesario', formatEuro(resultadosHipoteca.capitalPropioNecesario)],
      ['Cuota mensual', formatEuro(resultadosHipoteca.cuotaMensual)],
      ['Monto máximo financiable', formatEuro(resultadosHipoteca.montoMaximoFinanciable)],
      ['Total de intereses', formatEuro(resultadosHipoteca.totalIntereses)],
      ['Monto total a pagar', formatEuro(resultadosHipoteca.montoTotalPagar)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right', cellWidth: 'auto' } },
    margin: { left: margin, right: margin }
  });
  currentY = (doc as any).lastAutoTable.finalY + 5;

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

  const fileName = `Simulacion_Combinada_${datos.nombreCompleto.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
