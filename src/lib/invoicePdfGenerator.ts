import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { ProductInvoice } from '@/hooks/useProductInvoices';
import logoApunto from '@/assets/logo-apunto.jpg';

const FIXED_SERVICES: Record<string, { name: string; value: number }> = {
  nota_simples: { name: 'Nota Simples', value: 30 },
  tasaciones: { name: 'Tasaciones', value: 600 },
  beneficios: { name: 'Beneficios', value: 290 },
  inspeccion_tecnica: { name: 'Inspección Técnica', value: 3350 },
  iva_incluido: { name: 'IVA Incluido', value: 400 }
};

export async function generateInvoicePDF(invoice: ProductInvoice): Promise<string> {
  try {
    console.log('Iniciando geração de PDF para fatura:', invoice.invoice_number);
    
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Logo e cabeçalho da empresa
    try {
      const logoWidth = 25;
      const logoHeight = 25;
      doc.addImage(logoApunto, 'JPEG', margin, currentY, logoWidth, logoHeight);
    
    // Nome da empresa ao lado do logo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('APUNTO GROWTH AGENCY S.L.', margin + logoWidth + 5, currentY + 8);
    
    // Dados da empresa
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('NIF B67980078', margin + logoWidth + 5, currentY + 14);
    doc.text('c/ Muntaner nº262 5º 4ª', margin + logoWidth + 5, currentY + 18);
    doc.text('08021 Barcelona, Barcelona, España', margin + logoWidth + 5, currentY + 22);
    doc.text('Telf. 633582849', margin + logoWidth + 5, currentY + 26);
    
    currentY += logoHeight + 15;
  } catch (error) {
    console.error('Error loading logo:', error);
    currentY += 40;
  }

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // CLIENTE
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.client_company_name, margin, currentY);
  currentY += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`NIF ${invoice.client_dni_nif}`, margin, currentY);
  currentY += 6;
  doc.text(invoice.client_address, margin, currentY);
  currentY += 10;

  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // FACTURA
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const invoiceDate = new Date(invoice.created_at);
  doc.text(`Nº de factura    ${invoice.invoice_number}`, margin, currentY);
  currentY += 6;
  doc.text(`Fecha factura    ${invoiceDate.toLocaleDateString('es-ES')}`, margin, currentY);
  currentY += 6;
  if (invoice.payment_due_date) {
    doc.text(`Fecha vencimiento    ${new Date(invoice.payment_due_date).toLocaleDateString('es-ES')}`, margin, currentY);
    currentY += 6;
  }
  currentY += 4;

  // Tabela de serviços
  const tableData: any[] = [];
  const isDirectInvoice = invoice.monto_directo && invoice.monto_directo > 0 && !invoice.property_price;
  const applyIva = invoice.aplicar_iva !== false;
  const ivaRate = applyIva ? '21%' : '0%';
  const ivaMultiplier = applyIva ? 1.21 : 1;

  if (isDirectInvoice) {
    // Factura directa - mostrar descripción y monto
    tableData.push([
      invoice.descripcion_directa || 'Servicios varios',
      '1,00',
      invoice.monto_directo!.toFixed(2).replace('.', ','),
      ivaRate,
      (invoice.monto_directo! * ivaMultiplier).toFixed(2).replace('.', ',')
    ]);
  } else {
    // Factura con servicios
    // Serviços fixos
    Object.entries(FIXED_SERVICES).forEach(([key, service]) => {
      if (invoice[key as keyof ProductInvoice]) {
        tableData.push([
          service.name,
          '1,00',
          service.value.toFixed(2).replace('.', ','),
          '21%',
          (service.value * 1.21).toFixed(2).replace('.', ',')
        ]);
      }
    });

    // Comisión de Vivienda
    if (invoice.comision_vivienda && invoice.comision_vivienda_percent && invoice.property_price) {
      const value = invoice.property_price * (invoice.comision_vivienda_percent / 100);
      tableData.push([
        `Comisión de Vivienda (${invoice.comision_vivienda_percent}%)`,
        '1,00',
        value.toFixed(2).replace('.', ','),
        '21%',
        (value * 1.21).toFixed(2).replace('.', ',')
      ]);
    }

    // Crédito
    if (invoice.credito && invoice.credito_valor) {
      tableData.push([
        'Crédito',
        '1,00',
        invoice.credito_valor.toFixed(2).replace('.', ','),
        '21%',
        (invoice.credito_valor * 1.21).toFixed(2).replace('.', ',')
      ]);
    }

    // Hipoteca
    if (invoice.hipoteca && invoice.hipoteca_percent && invoice.property_price) {
      const value = invoice.property_price * (invoice.hipoteca_percent / 100);
      tableData.push([
        `Hipoteca (${invoice.hipoteca_percent}%)`,
        '1,00',
        value.toFixed(2).replace('.', ','),
        '21%',
        (value * 1.21).toFixed(2).replace('.', ',')
      ]);
    }
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Conceptos', 'Cant.', 'Precio uni.', 'Imp.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.5,
      lineColor: [200, 200, 200]
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Totales
  const xRight = pageWidth - margin - 60;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Base Imponible', xRight, currentY);
  doc.text(invoice.subtotal.toFixed(2).replace('.', ','), pageWidth - margin, currentY, { align: 'right' });
  currentY += 6;

  const ivaLabel = isDirectInvoice && !applyIva ? 'IVA 0%' : 'IVA 21%';
  doc.text(ivaLabel, xRight, currentY);
  doc.text(invoice.iva_amount.toFixed(2).replace('.', ','), pageWidth - margin, currentY, { align: 'right' });
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', xRight, currentY);
  doc.text(invoice.total.toFixed(2).replace('.', ',') + ' €', pageWidth - margin, currentY, { align: 'right' });
  currentY += 15;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Métodos de pago
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Métodos de pago', margin, currentY);
  currentY += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const paymentText = 'Transferencia bancaria al número de cuenta ES44 0049 0904 1525 1027 3202';
  const splitPayment = doc.splitTextToSize(paymentText, pageWidth - 2 * margin);
  doc.text(splitPayment, margin, currentY);
  currentY += (splitPayment.length * 5) + 5;

  doc.text('B67980078', margin, currentY);

  // Página
  doc.setFontSize(8);
  doc.text('1 / 1', pageWidth - margin, pageHeight - 10, { align: 'right' });

    // Salvar PDF no Supabase Storage
    console.log('Gerando blob do PDF...');
    const pdfBlob = doc.output('blob');
    const fileName = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${invoice.invoice_number}.pdf`;
    
    console.log('Fazendo upload do PDF para:', fileName);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do PDF:', uploadError);
      // Não bloquear a geração do PDF por falha no upload ao Storage
    } else {
      console.log('Upload realizado com sucesso:', uploadData);

      // Atualizar registro com caminho do PDF somente se upload funcionar
      console.log('Atualizando registro da fatura...');
      const { error: updateError } = await supabase
        .from('product_invoices')
        .update({ 
          pdf_path: fileName,
          status: 'generated'
        })
        .eq('id', invoice.id);

      if (updateError) {
        console.error('Erro ao atualizar registro da fatura:', updateError);
        // Também não bloquear por falha na atualização do registro
      } else {
        console.log('Registro atualizado com sucesso');
      }
    }

    // Também baixar no navegador
    doc.save(`Factura_${invoice.invoice_number}.pdf`);

    console.log('PDF gerado e baixado com sucesso');
    return fileName;
  } catch (error) {
    console.error('Erro ao gerar PDF da fatura:', error);
    throw error;
  }
}
