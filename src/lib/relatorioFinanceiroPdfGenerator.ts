import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import logoApunto from '@/assets/logo-apunto.jpg';

interface DadosMensais {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
  numFaturas: number;
  numDespesas: number;
}

interface Totais {
  receitas: number;
  despesas: number;
  saldo: number;
  numFaturas: number;
  numDespesas: number;
}

export async function generateRelatorioFinanceiroPDF(
  chartsElement: HTMLElement,
  dadosMensais: DadosMensais[],
  totais: Totais,
  dataInicio: string,
  dataFim: string
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = margin;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // PÁGINA 1 - Cabeçalho e Resumo
  try {
    const logoWidth = 25;
    const logoHeight = 25;
    doc.addImage(logoApunto, 'JPEG', margin, currentY, logoWidth, logoHeight);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO FINANCEIRO MENSAL', margin + logoWidth + 5, currentY + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${dataInicio} até ${dataFim}`, margin + logoWidth + 5, currentY + 18);
    doc.text(`Data de geração: ${new Date().toLocaleDateString('es-ES')}`, margin + logoWidth + 5, currentY + 24);
    
    currentY += logoHeight + 15;
  } catch (error) {
    console.error('Error loading logo:', error);
    currentY += 40;
  }

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // RESUMO EXECUTIVO
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO EXECUTIVO', margin, currentY);
  currentY += 10;

  // Cards de resumo
  const cardWidth = (pageWidth - 3 * margin) / 2;
  const cardHeight = 25;
  
  // Card Receitas
  doc.setFillColor(220, 252, 231); // green-50
  doc.rect(margin, currentY, cardWidth, cardHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Receitas', margin + 5, currentY + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // green-600
  doc.text(formatCurrency(totais.receitas), margin + 5, currentY + 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${totais.numFaturas} faturas`, margin + 5, currentY + 21);
  
  // Card Despesas
  doc.setFillColor(254, 226, 226); // red-50
  doc.rect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Total Despesas', margin + cardWidth + 15, currentY + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // red-600
  doc.text(formatCurrency(totais.despesas), margin + cardWidth + 15, currentY + 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${totais.numDespesas} despesas`, margin + cardWidth + 15, currentY + 21);
  
  currentY += cardHeight + 10;
  
  // Card Saldo
  const saldoColor = totais.saldo >= 0 ? { bg: [219, 234, 254], text: [37, 99, 235] } : { bg: [255, 237, 213], text: [234, 88, 12] };
  doc.setFillColor(saldoColor.bg[0], saldoColor.bg[1], saldoColor.bg[2]);
  doc.rect(margin, currentY, cardWidth, cardHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Saldo do Período', margin + 5, currentY + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(saldoColor.text[0], saldoColor.text[1], saldoColor.text[2]);
  doc.text(formatCurrency(totais.saldo), margin + 5, currentY + 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(totais.saldo >= 0 ? 'Superávit' : 'Déficit', margin + 5, currentY + 21);
  
  // Card ROI
  const roi = totais.despesas > 0 ? ((totais.saldo / totais.despesas) * 100).toFixed(1) : '0';
  doc.setFillColor(243, 232, 255); // purple-50
  doc.rect(margin + cardWidth + 10, currentY, cardWidth, cardHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('Taxa de Retorno (ROI)', margin + cardWidth + 15, currentY + 8);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(147, 51, 234); // purple-600
  doc.text(`${roi}%`, margin + cardWidth + 15, currentY + 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('ROI do período', margin + cardWidth + 15, currentY + 21);
  
  currentY += cardHeight + 15;

  // Reset cor do texto
  doc.setTextColor(0, 0, 0);

  // TABELA DE DADOS MENSAIS
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS MENSAIS DETALHADOS', margin, currentY);
  currentY += 8;

  const tableData = dadosMensais.map(dado => [
    dado.mes,
    formatCurrency(dado.receitas),
    formatCurrency(dado.despesas),
    formatCurrency(dado.saldo),
    dado.numFaturas.toString(),
    dado.numDespesas.toString()
  ]);

  // Adicionar linha de totais
  tableData.push([
    'TOTAL',
    formatCurrency(totais.receitas),
    formatCurrency(totais.despesas),
    formatCurrency(totais.saldo),
    totais.numFaturas.toString(),
    totais.numDespesas.toString()
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Mês', 'Receitas', 'Despesas', 'Saldo', 'Faturas', 'Despesas']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { halign: 'right', cellWidth: 28, textColor: [22, 163, 74] },
      2: { halign: 'right', cellWidth: 28, textColor: [220, 38, 38] },
      3: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 }
    },
    didParseCell: function(data) {
      // Última linha (totais) em negrito
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
      // Colorir saldo baseado em positivo/negativo
      if (data.column.index === 3 && data.row.index < tableData.length - 1) {
        const valor = dadosMensais[data.row.index].saldo;
        data.cell.styles.textColor = valor >= 0 ? [37, 99, 235] : [234, 88, 12];
      }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // NOVA PÁGINA - GRÁFICOS
  doc.addPage();
  currentY = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISE GRÁFICA', margin, currentY);
  currentY += 10;

  // Capturar gráficos como imagens
  try {
    const charts = chartsElement.querySelectorAll('.recharts-wrapper');
    
    for (let i = 0; i < Math.min(charts.length, 3); i++) {
      const chart = charts[i] as HTMLElement;
      
      // Scroll para o elemento estar visível
      chart.scrollIntoView({ behavior: 'instant', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(chart, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Se não couber na página, adicionar nova página
      if (currentY + imgHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      
      doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    }
  } catch (error) {
    console.error('Error capturing charts:', error);
    doc.setFontSize(10);
    doc.text('Erro ao capturar gráficos', margin, currentY);
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Apunto Growth Agency S.L. - Tu Hogar Posible | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Salvar PDF
  const fileName = `Relatorio_Financeiro_${dataInicio}_${dataFim}.pdf`;
  doc.save(fileName);
}