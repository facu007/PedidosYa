import * as XLSX from 'xlsx';
import type { Product } from './db';

export const exportProductsToExcel = (products: Product[]) => {
  // Map products to a user-friendly format for Excel
  const dataToExport = products.map((p) => ({
    'Código (Últimos 5 números)': p.code,
    'Ubicación': p.location,
    'Fecha de Registro': new Date(p.addedDate).toLocaleDateString(),
    'Fecha de Vencimiento': new Date(p.expiryDate + 'T00:00:00').toLocaleDateString(),
    'Registrado Por': p.addedBy,
    'Estado': p.isDiscarded ? 'Descartado' : mapStatusToSpanish(p.status),
    'Observaciones': p.observations || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial de Productos');

  // Auto-fit column widths
  const maxLengths = dataToExport.reduce((acc, row) => {
    Object.keys(row).forEach((key) => {
      const val = row[key as keyof typeof row]?.toString() || '';
      acc[key] = Math.max(acc[key] || key.length, val.length);
    });
    return acc;
  }, {} as Record<string, number>);

  worksheet['!cols'] = Object.keys(maxLengths).map((key) => ({
    wch: maxLengths[key] + 3,
  }));

  // Generate Excel file and trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `vencimientos_pedidosya_${dateStr}.xlsx`);
};

export const parseProductsFromExcel = (file: File): Promise<Partial<Product>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No se pudieron leer los datos del archivo'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        // Map and validate rows
        const parsedProducts: Partial<Product>[] = rawRows.map((row) => {
          // Find fields regardless of slight variations in header names
          const codeVal = row['Código (Últimos 5 números)'] || row['Código'] || row['codigo'] || row['Code'] || '';
          const locationVal = row['Ubicación'] || row['ubicacion'] || row['Location'] || '';
          let expiryVal = row['Fecha de Vencimiento'] || row['Vencimiento'] || row['vencimiento'] || row['Expiry Date'] || '';
          const obsVal = row['Observaciones'] || row['observaciones'] || row['Notes'] || '';

          // Format code (ensure 5 digits string)
          const code = codeVal.toString().trim().slice(-5);
          
          // Format expiry date
          let expiryDate = '';
          if (typeof expiryVal === 'number') {
            // Excel base date is 1899-12-30
            const date = new Date((expiryVal - 25569) * 86400 * 1000);
            expiryDate = date.toISOString().slice(0, 10);
          } else if (expiryVal) {
            // String date: check if it's DD/MM/YYYY or YYYY-MM-DD
            const parts = expiryVal.toString().split(/[\/\-]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                // YYYY-MM-DD
                expiryDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              } else {
                // DD/MM/YYYY
                expiryDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
          }

          return {
            code,
            location: locationVal.toString().trim(),
            expiryDate,
            observations: obsVal.toString().trim(),
          };
        }).filter(p => p.code && p.location && p.expiryDate); // Must have core fields

        resolve(parsedProducts);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo Excel'));
    reader.readAsArrayBuffer(file);
  });
};

const mapStatusToSpanish = (status: string): string => {
  switch (status) {
    case 'vigente': return '🟢 Vigente';
    case 'vence_hoy': return '🟡 Vence Hoy';
    case 'vence_manana': return '🟠 Vence Mañana';
    case 'vence_2_dias': return '🟠 Vence en 2 días';
    case 'vence_3_dias': return '🟠 Vence en 3 días';
    case 'vencido': return '🔴 Vencido';
    case 'descartado': return '⚫ Descartado';
    default: return status;
  }
};
