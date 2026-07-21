import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '../context/AppContext';
import { useAudio } from '../hooks/useAudio';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ConfirmationAnimation } from '../components/ConfirmationAnimation';
import { 
  X, 
  Camera, 
  Save, 
  AlertCircle, 
  AlertTriangle,
  FileText, 
  MapPin, 
  CalendarDays,
  Plus,
  Tag,
  Scale,
  DollarSign
} from 'lucide-react';
import { calculateSuggestedDiscount } from '../utils/discountCalculator';

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
  code: z.string()
    .length(5, 'El código debe tener exactamente 5 dígitos.')
    .regex(/^\d+$/, 'Solo se permiten números.'),
  category: z.enum(['cárnicos', 'embutidos', 'lácteos', 'vegetales', 'general']),
  location: z.string().min(1, 'Seleccione una ubicación.'),
  expiryDate: z.string().min(1, 'Seleccione una fecha de vencimiento.'),
  addedDate: z.string().min(1, 'Seleccione una fecha de carga.'),
  observations: z.string().optional(),
  unit: z.enum(['unidades', 'kg']),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1.'),
  weight: z.number().optional(),
  costPrice: z.number().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, productIdToEdit }) => {
  const { saveProduct, products } = useApp();
  const { playSuccess, playError } = useAudio();
  const [showScanner, setShowScanner] = useState(false);
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
  const selectedExpiry = watch('expiryDate');
  const selectedCost = watch('costPrice');
  const liveDiscount = calculateSuggestedDiscount(selectedExpiry, selectedCost);

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
        setValue('code', prod.code);
        setValue('category', prod.category || 'general');
        setValue('location', prod.location);
        setValue('expiryDate', prod.expiryDate);
        setValue('addedDate', prod.addedDate.split('T')[0]);
        setValue('observations', prod.observations || '');
        setValue('unit', prod.unit || (prod.category === 'cárnicos' || prod.weight ? 'kg' : 'unidades'));
        setValue('quantity', prod.quantity || 1);
        setValue('weight', prod.weight);
        setValue('costPrice', prod.costPrice);
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
      await saveProduct({
        id: productIdToEdit || crypto.randomUUID(),
        code: values.code,
        category: values.category,
        location: values.location,
        expiryDate: values.expiryDate,
        addedDate: new Date(values.addedDate + 'T12:00:00').toISOString(),
        observations: values.observations,
        quantity: values.quantity,
        unit: values.unit,
        weight: values.unit === 'kg' ? values.weight : undefined,
        costPrice: values.costPrice,
      });
      playSuccess();
      setShowConfirmation(true);
    } catch (err) {
      console.error(err);
      playError();
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    setValue('code', scannedCode);
    setShowScanner(false);
  };

  const handleFinishedConfirmation = () => {
    setShowConfirmation(false);
    onClose();
  };

  // Watch for character changes in code input to block non-numbers
  const codeValue = watch('code');
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setValue('code', value);
  };

  // Duplicate product check
  const duplicateProduct = products.find(
    (p) => p.code === codeValue && !p.isDiscarded && p.id !== productIdToEdit
  );

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-lg overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-[#FF1744] text-white">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span>{productIdToEdit ? 'Editar Producto' : 'Agregar Producto'}</span>
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
                Últimos 5 números del producto
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={codeValue}
                    onChange={handleCodeChange}
                    placeholder="Ej. 45821"
                    maxLength={5}
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
                  onClick={() => setShowScanner(true)}
                  className="px-4 py-3 bg-[#FF1744]/10 text-[#FF1744] hover:bg-[#FF1744]/20 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Escanear</span>
                </button>
              </div>
              
              {errors.code && (
                <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.code.message}</p>
              )}

              {/* Duplicate code alert */}
              {duplicateProduct && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-250 dark:border-amber-500/20 rounded-xl text-xs space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>¡Producto ya ingresado!</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-350 font-medium leading-relaxed">
                    Este código de barras ya está registrado en <span className="font-bold">{duplicateProduct.location}</span> con fecha de vencimiento el <span className="font-bold">{new Date(duplicateProduct.expiryDate + 'T00:00:00').toLocaleDateString()}</span>.
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

            {/* Location selector */}
            <div>
              <label className="block text-xs font-bold text-[#000000] dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Ubicación</span>
              </label>
              <select
                {...register('location')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
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

            {/* Cost & Live Suggested Discount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#FF1744]" />
                  <span>Descuento Sugerido (Martes)</span>
                </label>
                <div className="h-[46px] flex items-center px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-750 font-bold text-sm">
                  {liveDiscount.percentage > 0 ? (
                    <span className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 ${liveDiscount.badgeClass}`}>
                      <span>{liveDiscount.label}</span>
                      {liveDiscount.savingsPerUnit && (
                        <span className="text-[10px] opacity-90">(-${liveDiscount.savingsPerUnit.toFixed(2)})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Sin descuento (Precio regular)</span>
                  )}
                </div>
              </div>
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
                <span>{productIdToEdit ? 'Guardar Cambios' : 'Registrar'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Camera barcode scanner modal overlay */}
      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Confirmation animation overlay */}
      <ConfirmationAnimation
        isVisible={showConfirmation}
        onFinished={handleFinishedConfirmation}
        message={productIdToEdit ? "¡Producto Actualizado!" : "¡Producto Registrado!"}
      />
    </>
  );
};
