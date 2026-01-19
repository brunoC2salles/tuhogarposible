import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormularioDescubiertaData, TitularData } from '@/schemas/formularioDescubiertaSchema';
import { formatDateTime, formatEuro } from './simuladorUtils';
import logo from '@/assets/logo.png';

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  soltero: 'Soltero/a',
  casado: 'Casado/a',
  divorciado: 'Divorciado/a',
  viudo: 'Viudo/a',
};

const TIPO_CONTRATO_LABELS: Record<string, string> = {
  funcionario: 'Funcionario',
  indefinido: 'Indefinido',
  interino: 'Interino',
  fijo_discontinuo: 'Fijo Discontinuo',
  temporal: 'Temporal',
  autonomo: 'Autónomo',
};

function formatTitularData(titular: TitularData): string[][] {
  return [
    ['Nombre y Apellidos', titular.nombreApellidos],
    ['Fecha de Nacimiento', titular.fechaNacimiento],
    ['DNI/NIE Permanente', titular.dniNie],
    ['Estado Civil', ESTADO_CIVIL_LABELS[titular.estadoCivil] || titular.estadoCivil],
    ['Nº de Hijos', titular.numHijos.toString()],
    ['Teléfono', titular.telefono],
    ['Profesión', titular.profesion],
    ['Tipo de Contrato', TIPO_CONTRATO_LABELS[titular.tipoContrato] || titular.tipoContrato],
    ['Antigüedad', titular.antiguedad],
    ['Ingresos Totales (12 pagas)', formatEuro(titular.ingresosTotales)],
    ['Otros Ingresos o Inversiones', titular.otrosIngresos || 'No especificado'],
    ['Activos Inmobiliarios', titular.activosInmobiliarios || 'No especificado'],
    ['¿Tiene Préstamos Personales?', titular.tienePrestamosPersonales ? 'Sí' : 'No'],
    ['¿Tiene Alguna Deuda?', titular.tieneDeudas ? 'Sí' : 'No'],
  ];
}

export function generateDescubiertaPDF(data: FormularioDescubiertaData) {
  const doc = new jsPDF();
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
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('FICHA DESCUBIERTA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${formatDateTime()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // TITULAR 1
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('DATOS DE TITULAR 1', margin, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    head: [['Campo', 'Valor']],
    body: formatTitularData(data.titular1),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // TITULAR 2 (si existe)
  if (data.tieneSegundoTitular && data.titular2) {
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE TITULAR 2', margin, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      head: [['Campo', 'Valor']],
      body: formatTitularData(data.titular2),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold', fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // DATOS DE LA OPERACIÓN
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA OPERACIÓN', margin, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    head: [['Campo', 'Valor']],
    body: [
      ['Porcentaje de Financiación', `${data.porcentajeFinanciacion}%`],
      ['Precio de Compraventa', formatEuro(data.precioCompraventa)],
      ['Valor de Tasación Aproximado', formatEuro(data.valorTasacionAproximado)],
      ['¿Va con Préstamo Personal?', data.conPrestamoPersonal ? 'Sí' : 'No'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246], fontStyle: 'bold', fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // RGPD
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(34, 197, 94);
  doc.text('✓ POLÍTICA DE PRIVACIDAD', margin, currentY);
  currentY += 5;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text('El usuario ha aceptado la Política de Privacidad y el tratamiento de sus datos conforme al RGPD.', margin, currentY);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Documento generado el ${formatDateTime()} - Tu Hogar Posible`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Salvar
  const fileName = `Descubierta_${data.titular1.nombreApellidos.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
