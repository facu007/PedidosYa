import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '../context/AppContext';
import { useAudio } from '../hooks/useAudio';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ConfirmationAnimation } from '../components/ConfirmationAnimation';
import type { Product } from '../services/db';
import { 
  X, 
  Camera, 
  Save, 
  AlertCircle, 
  CheckCircle,
  FileText, 
  MapPin, 
  CalendarDays,
  Plus,
  Tag,
  Scale,
  DollarSign
} from 'lucide-react';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  productIdToEdit?: string | null;
}

const locations = [
  'Heladera 1',
  'Heladera 2',
  'Heladera 3',
  'Heladera 4',
  'Heladera 5',
  'Heladera 6',
  'Heladera 7',
  'Heladera 8',
  'Heladera 9',
  'Heladera 10',
  'Heladera 11',
  'Heladera 12',
  'Heladera 13',
  'Heladera 14',
  'Heladera 15',
  'Heladera 16',
  'Heladera 17',
  'Heladera 18',
  'Freezer 1',
  'Freezer 2',
  'Freezer 3',
  'Freezer 4',
  'Freezer 5',
  'Freezer 6',
  'Freezer 7',
  'Freezer 8',
];

const productSchema = z.object({
  code: z.string().min(1, 'Ingrese o escanee el código del producto.'),
  category: z.enum(['cárnicos', 'embutidos', 'lácteos', 'vegetales', 'general']),
  location: z.string().min(1, 'Seleccione o ingrese una ubicación.'),
  expiryDate: z.string().min(1, 'Seleccione una fecha de vencimiento.'),
  addedDate: z.string().min(1, 'Seleccione una fecha de carga.'),
  observations: z.string().optional(),
  unit: z.enum(['unidades', 'kg']),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1.'),
  weight: z.number().optional().or(z.nan()),
  costPrice: z.number().optional().or(z.nan()),
});

type ProductFormValues = z.infer<typeof productSchema>;

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, productIdToEdit }) => {
  const { saveProduct, products } = useApp();
  const { playSuccess, playError } = useAudio();
  const [scannerMode, setScannerMode] = useState<'code' | 'location' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: '',
      category: 'general',
      location: 'Heladera 1',
      expiryDate: '',
      addedDate: new Date().toISOString().split('T')[0],
      observations: '',
      unit: 'unidades',
      quantity: 1,
      weight: undefined,
      costPrice: undefined,
    },
  });

  const selectedCategory = watch('category');
  const selectedUnit = watch('unit');
  const codeValue = watch('code');

  // Find duplicate or existing product by code
  const duplicateProduct = products.find(
    (p) => p.code && codeValue && p.code.trim() === codeValue.trim() && !p.isDiscarded && p.id !== productIdToEdit
  );

  const loadProductValues = (prod: Product) => {
    setValue('code', prod.code);
    setValue('category', prod.category || 'general');
    setValue('location', prod.location);
    setValue('expiryDate', prod.expiryDate);
    if (prod.addedDate) {
      setValue('addedDate', prod.addedDate.split('T')[0]);
    }
    setValue('observations', prod.observations || '');
    setValue('unit', prod.unit || (prod.category === 'cárnicos' || prod.weight ? 'kg' : 'unidades'));
    setValue('quantity', prod.quantity || 1);
    setValue('weight', prod.weight);
    setValue('costPrice', prod.costPrice);
  };

  // Auto switch unit to 'kg' when selecting 'cárnicos' if creating a new product
  useEffect(() => {
    if (!productIdToEdit) {
      if (selectedCategory === 'cárnicos') {
        setValue('unit', 'kg');
      }
    }
  }, [selectedCategory, productIdToEdit, setValue]);

  // Load product to edit if productIdToEdit changes
  useEffect(() => {
    if (productIdToEdit) {
      const prod = products.find((p) => p.id === productIdToEdit);
      if (prod) {
        loadProductValues(prod);
      }
    } else {
      reset({
        code: '',
        category: 'general',
        location: 'Heladera 1',
        expiryDate: '',
        addedDate: new Date().toISOString().split('T')[0],
        observations: '',
        unit: 'unidades',
        quantity: 1,
        weight: undefined,
        costPrice: undefined,
      });
    }
  }, [productIdToEdit, products, setValue, reset, isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const weightVal = values.unit === 'kg' && values.weight !== undefined && values.weight !== null && !isNaN(values.weight) ? values.weight : undefined;
      const costVal = values.costPrice !== undefined && values.costPrice !== null && !isNaN(values.costPrice) ? values.costPrice : undefined;
      const quantityVal = values.quantity && !isNaN(values.quantity) && values.quantity >= 1 ? values.quantity : 1;

      const addedDateObj = values.addedDate ? new Date(values.addedDate.includes('T') ? values.addedDate : values.addedDate + 'T12:00:00') : new Date();
      const addedDateISO = isNaN(addedDateObj.getTime()) ? new Date().toISOString() : addedDateObj.toISOString();

      const targetId = productIdToEdit || (duplicateProduct ? duplicateProduct.id : crypto.randomUUID());

      await saveProduct({
        id: targetId,
        code: values.code.trim(),
        category: values.category,
        location: values.location,
        expiryDate: values.expiryDate,
        addedDate: addedDateISO,
        observations: values.observations,
        quantity: quantityVal,
        unit: values.unit,
        weight: weightVal,
        costPrice: costVal,
      });
      playSuccess();
      setShowConfirmation(true);
    } catch (err) {
      console.error(err);
      playError();
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    if (scannerMode === 'code') {
      const cleanCode = scannedCode.trim();
      setValue('code', cleanCode);
      const existing = products.find(p => p.code && p.code.trim() === cleanCode && !p.isDiscarded);
      if (existing) {
        loadProductValues(existing);
      }
    } else if (scannerMode === 'location') {
      setValue('location', scannedCode.trim());
    }
    setScannerMode(null);
  };

  const handleFinishedConfirmation = () => {
    setShowConfirmation(false);
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setValue('code', value);
  };

  const isEditingExisting = Boolean(productIdToEdit || duplicateProduct);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-lg overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-[#FF1744] text-white">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span>{isEditingExisting ? 'Editar Producto' : 'Agregar Producto'}</span>
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* Code Field with Scanner option */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2">
                Código del producto / Código de barras
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={codeValue}
                    onChange={handleCodeChange}
                    placeholder="Ej. 7791234567890"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.code ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                    } bg-slate-50 dark:bg-slate-750 text-black dark:text-white placeholder-slate-455 focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold`}
                  />
                  {errors.code && (
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-red-500">
                      <AlertCircle className="w-5 h-5" />
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setScannerMode('code')}
                  className="px-4 py-3 bg-[#FF1744]/10 text-[#FF1744] hover:bg-[#FF1744]/20 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs cursor-pointer shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Escanear</span>
                </button>
              </div>
              
              {errors.code && (
                <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.code.message}</p>
              )}

              {/* Duplicate code alert with fast load & edit button */}
              {duplicateProduct && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between font-extrabold text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>¡Producto ya existe en inventario!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadProductValues(duplicateProduct)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Cargar datos actuales
                    </button>
                  </div>
                  <p className="text-slate-600 dark:text-slate-350 text-[11px] leading-relaxed">
                    Registrado en <span className="font-bold text-slate-800 dark:text-white">{duplicateProduct.location}</span> con fecha <span className="font-bold text-slate-800 dark:text-white">{new Date(duplicateProduct.expiryDate + 'T00:00:00').toLocaleDateString()}</span> ({duplicateProduct.quantity || 1} un.). Puedes modificar la fecha y la cantidad a continuación.
                  </p>
                </div>
              )}
            </div>

            {/* Category selector */}
            <div>
              <label className="block text-xs font-bold text-[#000000] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Categoría</span>
              </label>
              <select
                {...register('category')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
              >
                <option value="general">General (Otros)</option>
                <option value="cárnicos">Cárnicos (Carnes)</option>
                <option value="embutidos">Embutidos (Fiambres)</option>
                <option value="lácteos">Lácteos (Lácteos/Quesos)</option>
                <option value="vegetales">Vegetales (Verduras/Frutas)</option>
              </select>
              {errors.category && (
                <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.category.message}</p>
              )}
            </div>

            {/* Location input with LBI Scanner option */}
            <div>
              <label className="block text-xs font-bold text-[#000000] dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Ubicación / LBI</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    list="locations-list"
                    placeholder="Ej. Heladera 1 o LBI-H01"
                    {...register('location')}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.location ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                    } bg-slate-50 dark:bg-slate-750 text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold`}
                  />
                  <datalist id="locations-list">
                    {locations.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={() => setScannerMode('location')}
                  className="px-4 py-3 bg-[#FF1744]/10 text-[#FF1744] hover:bg-[#FF1744]/20 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs shrink-0 cursor-pointer"
                  title="Escanear código de ubicación (LBI)"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Escanear LBI</span>
                </button>
              </div>
              {errors.location && (
                <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.location.message}</p>
              )}
            </div>

            {/* Unit type & Quantity / Weight */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-750/50 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <label className="block text-xs font-bold text-[#000000] dark:text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#FF1744]" />
                <span>Modalidad de Registro (Unidad / Peso)</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValue('unit', 'unidades')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedUnit === 'unidades'
                      ? 'bg-[#FF1744] text-white border-[#FF1744] shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <span>📦 Unidades</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('unit', 'kg')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedUnit === 'kg'
                      ? 'bg-[#FF1744] text-white border-[#FF1744] shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <span>⚖️ Peso (Kg)</span>
                </button>
              </div>

              {selectedUnit === 'kg' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wider mb-1">
                      Peso Total (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min={0.001}
                      placeholder="Ej: 1.500"
                      {...register('weight', { valueAsNumber: true })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
                    />
                    {errors.weight && (
                      <p className="text-xs text-red-500 font-semibold mt-1">{errors.weight.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wider mb-1">
                      Bultos / Piezas
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register('quantity', { valueAsNumber: true })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wider mb-1">
                    Cantidad (Unidades)
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register('quantity', { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
                  />
                  {errors.quantity && (
                    <p className="text-xs text-red-500 font-semibold mt-1">{errors.quantity.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Dates Grid (Loading Date & Expiry Date side-by-side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Loading Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha de Carga</span>
                </label>
                <input
                  type="date"
                  {...register('addedDate')}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.addedDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  } bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold`}
                />
                {errors.addedDate && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.addedDate.message}</p>
                )}
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha de Vencimiento</span>
                </label>
                <input
                  type="date"
                  {...register('expiryDate')}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    errors.expiryDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                  } bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold`}
                />
                {errors.expiryDate && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.expiryDate.message}</p>
                )}
              </div>
            </div>

            {/* Cost field */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Costo / Precio Estimado ($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 450.00"
                {...register('costPrice', { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
              />
            </div>

            {/* Observations (optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Observaciones (Opcional)</span>
              </label>
              <textarea
                {...register('observations')}
                placeholder="Detalles adicionales, marca del producto, lote..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-medium"
              />
            </div>

            {/* Action Footer inside Form */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-[#FF1744] text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-200 dark:shadow-none text-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isEditingExisting ? 'Guardar Cambios' : 'Registrar'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Camera barcode scanner modal overlay */}
      {scannerMode && (
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setScannerMode(null)}
          mode={scannerMode === 'location' ? 'text' : 'product'}
          title={scannerMode === 'location' ? 'Escanear Ubicación (LBI)' : 'Escanear Código de Producto'}
          subtitle={scannerMode === 'location' ? 'Ubica el código de ubicación (LBI) dentro del recuadro' : 'Ubica el código de barras del producto dentro del recuadro'}
        />
      )}

      {/* Confirmation animation overlay */}
      <ConfirmationAnimation
        isVisible={showConfirmation}
        onFinished={handleFinishedConfirmation}
        message={isEditingExisting ? "¡Producto Actualizado!" : "¡Producto Registrado!"}
      />
    </>
  );
};
