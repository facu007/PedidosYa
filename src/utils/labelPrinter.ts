import type { Product } from '../services/db';
import { calculateSuggestedDiscount } from './discountCalculator';

export const printProductLabel = (product: Product) => {
  const discount = calculateSuggestedDiscount(product.expiryDate, product.costPrice);
  const printWindow = window.open('', '_blank', 'width=450,height=600');
  
  if (!printWindow) {
    alert('Por favor permita ventanas emergentes (popups) para imprimir etiquetas.');
    return;
  }

  const expiryFormatted = new Date(product.expiryDate + 'T00:00:00').toLocaleDateString();
  const addedFormatted = new Date(product.addedDate).toLocaleDateString();
  const quantityText = product.unit === 'kg' || product.weight 
    ? `${product.weight ? `${product.weight} Kg` : 'Por peso'} (${product.quantity} pzs)` 
    : `${product.quantity} unidades`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta #${product.code}</title>
      <style>
        @page {
          size: 80mm 100mm;
          margin: 0;
        }
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 12px;
          color: #000;
          background: #fff;
          width: 76mm;
          box-sizing: border-box;
        }
        .container {
          border: 2px solid #000;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
        }
        .brand {
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #FF1744;
          margin-bottom: 4px;
        }
        .code {
          font-size: 32px;
          font-weight: 900;
          font-family: monospace;
          margin: 6px 0;
          letter-spacing: 2px;
        }
        .badge-row {
          display: flex;
          justify-content: space-around;
          margin: 8px 0;
          font-size: 11px;
          font-weight: bold;
        }
        .badge {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .expiry-box {
          background: #000;
          color: #fff;
          padding: 8px;
          border-radius: 6px;
          margin: 10px 0;
        }
        .expiry-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .expiry-date {
          font-size: 22px;
          font-weight: 900;
        }
        .discount-badge {
          background: #FF1744;
          color: #fff;
          font-size: 14px;
          font-weight: bold;
          padding: 5px;
          border-radius: 4px;
          margin-top: 6px;
        }
        .footer {
          font-size: 9px;
          color: #555;
          margin-top: 10px;
          border-top: 1px dashed #ccc;
          padding-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="brand">PedidosYa - Control de Vencimientos</div>
        <div class="code">#${product.code}</div>
        
        <div class="badge-row">
          <div class="badge">📍 ${product.location}</div>
          <div class="badge">🏷️ ${(product.category || 'general').toUpperCase()}</div>
        </div>

        <div class="badge-row">
          <div class="badge">📦 ${quantityText}</div>
          ${product.costPrice ? `<div class="badge">💲 $${product.costPrice}</div>` : ''}
        </div>

        <div class="expiry-box">
          <div class="expiry-title">FECHA DE VENCIMIENTO</div>
          <div class="expiry-date">${expiryFormatted}</div>
        </div>

        ${discount.percentage > 0 ? `<div class="discount-badge">SUGERENCIA: ${discount.label}</div>` : ''}

        <div class="footer">
          Cargado el ${addedFormatted} por ${product.addedBy}
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
