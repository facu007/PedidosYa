import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Product } from './db';

export const exportProductsToPDF = (products: Product[]) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();

  // Header Background decoration
  doc.setFillColor(255, 23, 68); // #FF1744 (PedidosYa Red)
  doc.rect(0, 0, 210, 30, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('CONTROL DE VENCIMIENTOS', 15, 18);
  doc.setFontSize(14);
  doc.text('PedidosYa', 150, 18);

  // Subheader Info
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha del Reporte: ${dateStr}`, 15, 40);

  // Expiry Statistics Summary
  const expiredCount = products.filter(p => p.status === 'vencido' && !p.isDiscarded).length;
  const todayCount = products.filter(p => p.status === 'vence_hoy' && !p.isDiscarded).length;
  const nearCount = products.filter(p => ['vence_manana', 'vence_2_dias', 'vence_3_dias'].includes(p.status) && !p.isDiscarded).length;
  
  doc.text(`Productos Vencidos: ${expiredCount}`, 15, 46);
  doc.text(`Vencen Hoy: ${todayCount}`, 75, 46);
  doc.text(`Vencen en 1-3 días: ${nearCount}`, 135, 46);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 220, 220);
  doc.line(15, 52, 195, 52);

  // Filter and sort products: expired first, then near expiry
  const activeProducts = products
    .filter(p => !p.isDiscarded)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const tableRows = activeProducts.map((p) => [
    p.code,
    p.location,
    new Date(p.expiryDate + 'T00:00:00').toLocaleDateString(),
    mapStatusToText(p.status),
    p.observations || '-'
  ]);

  // Generate Table
  autoTable(doc, {
    startY: 56,
    head: [['Código (Últimos 5)', 'Ubicación', 'Vencimiento', 'Estado', 'Observaciones']],
    body: tableRows,
    headStyles: {
      fillColor: [255, 23, 68], // Red #FF1744
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250] // light grey background
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 35 },
      4: { cellWidth: 'auto' }
    },
    didDrawPage: (data) => {
      // Footer page number
      const pageCount = doc.getNumberOfPages();
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, 15, 285);
    }
  });

  doc.save(`reporte_vencimientos_${new Date().toISOString().slice(0, 10)}.pdf`);
};

const mapStatusToText = (status: string): string => {
  switch (status) {
    case 'vigente': return 'Vigente';
    case 'vence_hoy': return 'Vence Hoy';
    case 'vence_manana': return 'Vence Mañana';
    case 'vence_2_dias': return 'Vence en 2 Días';
    case 'vence_3_dias': return 'Vence en 3 Días';
    case 'vencido': return 'VENCIDO';
    case 'descartado': return 'Descartado';
    default: return status;
  }
};
