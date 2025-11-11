import jsPDF from 'jspdf';
import { DatosContrato } from '@/types/contratos';

// Estrutura base para geração de contratos
// Por enquanto, templates simples - usuário pode subir PDFs com campos variáveis depois

export const generateContratoCompraVenta = (datos: DatosContrato): jsPDF => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE COMPRAVENTA', 105, 20, { align: 'center' });
  
  // Info básica
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  let y = 40;
  
  doc.text(`Fecha: ${datos.fecha_contrato}`, 20, y);
  y += 10;
  
  // Dados do comprador
  doc.setFont('helvetica', 'bold');
  doc.text('COMPRADOR:', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${datos.cliente_nombre}`, 20, y);
  y += 6;
  doc.text(`DNI: ${datos.cliente_dni}`, 20, y);
  y += 6;
  doc.text(`Teléfono: ${datos.cliente_telefono}`, 20, y);
  y += 6;
  doc.text(`Email: ${datos.cliente_email}`, 20, y);
  y += 10;
  
  // Dados do imóvel (se houver)
  if (datos.inmueble_direccion) {
    doc.setFont('helvetica', 'bold');
    doc.text('PROPIEDAD:', 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Dirección: ${datos.inmueble_direccion}`, 20, y);
    y += 6;
    if (datos.inmueble_referencia) {
      doc.text(`Referencia: ${datos.inmueble_referencia}`, 20, y);
      y += 6;
    }
  }
  
  // Valor
  doc.setFont('helvetica', 'bold');
  doc.text(`VALOR DE OPERACIÓN: €${datos.valor_operacion.toLocaleString('es-ES')}`, 20, y);
  y += 10;
  
  if (datos.forma_pago) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Forma de pago: ${datos.forma_pago}`, 20, y);
  }
  
  return doc;
};

export const generateContratoAlquiler = (datos: DatosContrato): jsPDF => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE ALQUILER', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  let y = 40;
  doc.text(`Fecha: ${datos.fecha_contrato}`, 20, y);
  y += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('ARRENDATARIO:', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${datos.cliente_nombre}`, 20, y);
  y += 6;
  doc.text(`DNI: ${datos.cliente_dni}`, 20, y);
  y += 6;
  doc.text(`Teléfono: ${datos.cliente_telefono}`, 20, y);
  y += 10;
  
  if (datos.inmueble_direccion) {
    doc.setFont('helvetica', 'bold');
    doc.text('PROPIEDAD:', 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Dirección: ${datos.inmueble_direccion}`, 20, y);
    y += 10;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text(`RENTA MENSUAL: €${datos.valor_operacion.toLocaleString('es-ES')}`, 20, y);
  
  return doc;
};

export const generateContratoReserva = (datos: DatosContrato): jsPDF => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE RESERVA', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  let y = 40;
  doc.text(`Fecha: ${datos.fecha_contrato}`, 20, y);
  y += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${datos.cliente_nombre}`, 20, y);
  y += 6;
  doc.text(`DNI: ${datos.cliente_dni}`, 20, y);
  y += 6;
  doc.text(`Teléfono: ${datos.cliente_telefono}`, 20, y);
  y += 10;
  
  if (datos.inmueble_direccion) {
    doc.setFont('helvetica', 'bold');
    doc.text('PROPIEDAD RESERVADA:', 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Dirección: ${datos.inmueble_direccion}`, 20, y);
    y += 10;
  }
  
  if (datos.valor_reserva) {
    doc.setFont('helvetica', 'bold');
    doc.text(`IMPORTE DE RESERVA: €${datos.valor_reserva.toLocaleString('es-ES')}`, 20, y);
    y += 8;
  }
  
  if (datos.plazo_dias) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Plazo de reserva: ${datos.plazo_dias} días`, 20, y);
  }
  
  return doc;
};
