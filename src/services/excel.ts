import * as XLSX from 'xlsx';
import type { Product } from './db';

export const exportProductsToExcel = (products: Product[], locationFilterName?: string) => {
  // Map products to a complete, user-friendly and restore-compatible format for Excel
  const dataToExport = products.map((p) => ({
    'ID': p.id,
    'Código de Barras': p.code,
    'Sector': p.sector || 'snack',
    'Categoría': p.category || 'general',
    'Ubicación': p.location,
    'Unidad': p.unit || (p.weight !== undefined ? 'kg' : 'unidades'),
    'Cantidad (Piezas/Unidades)': p.quantity ?? 1,
    'Peso (Kg)': p.weight !== undefined ? p.weight : '',
    'Costo / Precio ($)': p.costPrice !== undefined ? p.costPrice : '',
    'Fecha de Vencimiento': p.expiryDate, // YYYY-MM-DD
    'Fecha de Registro': p.addedDate ? p.addedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    'Registrado Por': p.addedBy || 'sistema',
    'Estado': p.isDiscarded ? 'Descartado' : mapStatusToSpanish(p.status),
    'Verificado': p.isChecked ? 'Sí' : 'No',
    'Observaciones': p.observations || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  const sheetName = locationFilterName ? `Ubicación ${locationFilterName}`.slice(0, 31) : 'Respaldo Productos';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

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
  const locSuffix = locationFilterName ? `_${locationFilterName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  XLSX.writeFile(workbook, `respaldo_pedidosya${locSuffix}_${dateStr}.xlsx`);
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
          const idVal = row['ID'] || row['id'] || row['Id'] || row['ID Único'] || '';
          const codeVal = row['Código de Barras'] || row['Código (Últimos 5 números)'] || row['Código'] || row['codigo'] || row['Code'] || row['Codigo'] || '';
          const sectorVal = row['Sector'] || row['sector'] || '';
          const categoryVal = row['Categoría'] || row['categoría'] || row['categoria'] || row['Category'] || 'general';
          const locationVal = row['Ubicación'] || row['ubicacion'] || row['Location'] || row['Ubicacion'] || '';
          const expiryVal = row['Fecha de Vencimiento'] || row['Vencimiento'] || row['vencimiento'] || row['Expiry Date'] || row['Fecha Vencimiento'] || '';
          const addedDateVal = row['Fecha de Registro'] || row['Fecha de Carga'] || row['Fecha Registro'] || row['addedDate'] || '';
          const addedByVal = row['Registrado Por'] || row['Usuario'] || row['addedBy'] || '';
          const obsVal = row['Observaciones'] || row['observaciones'] || row['Notes'] || row['Notas'] || '';
          const unitVal = row['Unidad'] || row['unidad'] || row['Unit'] || '';
          const qtyVal = row['Cantidad (Piezas/Unidades)'] ?? row['Cantidad'] ?? row['cantidad'] ?? row['Quantity'] ?? 1;
          const weightVal = row['Peso (Kg)'] ?? row['Peso'] ?? row['peso'] ?? row['Weight'];
          const costVal = row['Costo / Precio ($)'] ?? row['Costo'] ?? row['costo'] ?? row['Precio'] ?? row['Cost'];
          const isCheckedVal = row['Verificado'] ?? row['Checklist'] ?? row['isChecked'];

          // Format code string
          const code = codeVal.toString().trim();

          const rawSector = sectorVal.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          let sector: Product['sector'] = 'snack';
          if (['snack', 'kiosco', 'desayuno', 'almacen', 'galletas', 'heladeras', 'freezers'].includes(rawSector)) {
            sector = rawSector as Product['sector'];
          } else if (rawSector.includes('helad')) {
            sector = 'heladeras';
          } else if (rawSector.includes('freez')) {
            sector = 'freezers';
          } else if (rawSector.includes('kios')) {
            sector = 'kiosco';
          } else if (rawSector.includes('desay')) {
            sector = 'desayuno';
          } else if (rawSector.includes('alma')) {
            sector = 'almacen';
          } else if (rawSector.includes('gall')) {
            sector = 'galletas';
          }
          
          const rawCat = categoryVal.toString().trim().toLowerCase();
          const category = ['cárnicos', 'embutidos', 'lácteos', 'vegetales', 'general'].includes(rawCat)
            ? rawCat as Product['category']
            : 'general';
          
          const unit: Product['unit'] = unitVal.toString().trim().toLowerCase() === 'kg' 
            || (category === 'cárnicos' && unitVal.toString().trim().toLowerCase() !== 'unidades') 
            || (weightVal !== undefined && weightVal !== '') ? 'kg' : 'unidades';

          const parseOptionalNumber = (value: unknown): number | undefined => {
            if (value === undefined || value === null || value === '') return undefined;
            const parsed = Number.parseFloat(String(value).replace(',', '.'));
            return Number.isFinite(parsed) ? parsed : undefined;
          };
          const weight = parseOptionalNumber(weightVal);
          const parsedQuantity = parseOptionalNumber(qtyVal);
          const quantity = parsedQuantity !== undefined && parsedQuantity >= 0 ? Math.trunc(parsedQuantity) : 1;
          const costPrice = parseOptionalNumber(costVal);

          // Format expiry date
          let expiryDate = '';
          if (typeof expiryVal === 'number') {
            // Excel base date is 1899-12-30
            const date = new Date(Math.round((expiryVal - 25569) * 86400 * 1000));
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            expiryDate = `${y}-${m}-${d}`;
          } else if (expiryVal) {
            const strVal = expiryVal.toString().trim();
            // Handle ISO format YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}/.test(strVal)) {
              expiryDate = strVal.slice(0, 10);
            } else {
              const parts = strVal.split(/[/-]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  // YYYY-MM-DD
                  expiryDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                  // DD/MM/YYYY
                  expiryDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }
          }

          // Format added date
          let addedDate = new Date().toISOString();
          if (addedDateVal) {
            const strAdded = addedDateVal.toString().trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(strAdded)) {
              addedDate = `${strAdded.slice(0, 10)}T12:00:00.000Z`;
            }
          }

          const isChecked = isCheckedVal === 'No' || isCheckedVal === false || isCheckedVal === 'false' ? false : true;

          return {
            id: idVal ? idVal.toString().trim() : undefined,
            code,
            sector,
            category,
            location: locationVal.toString().trim() || 'Heladera 1',
            expiryDate,
            addedDate,
            addedBy: addedByVal.toString().trim() || undefined,
            unit,
            weight,
            quantity,
            costPrice,
            isChecked,
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
    case 'vence_manana': return '🟠 Vence Mañana (1 día)';
    case 'vence_2_dias': return '🟠 Vence en 2 días';
    case 'vence_3_dias': return '🟠 Vence en 3 días';
    case 'vence_7_dias': return '📅 Vence en 7 días (Cargar producto)';
    case 'vence_10_dias': return '📅 Vence en 10 días (Aviso anticipado)';
    case 'proximo': return '🟠 Próximo a Vencer';
    case 'vencido': return '🔴 Vencido';
    case 'descartado': return '⚫ Descartado';
    default: return status;
  }
};

