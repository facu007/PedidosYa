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
  Plus
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
  'Freezer 1',
  'Freezer 2',
  'Freezer 3',
];

const productSchema = z.object({
  code: z.string()
    .length(5, 'El código debe tener exactamente 5 números.')
    .regex(/^\d+$/, 'Solo se permiten números.'),
  location: z.string().min(1, 'Seleccione una ubicación.'),
  expiryDate: z.string().min(1, 'Seleccione una fecha de vencimiento.'),
  addedDate: z.string().min(1, 'Seleccione una fecha de carga.'),
  observations: z.string().optional(),
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
      location: 'Heladera 1',
      expiryDate: '',
      addedDate: new Date().toISOString().split('T')[0],
      observations: '',
    },
  });

  // Load product to edit if productIdToEdit changes
  useEffect(() => {
    if (productIdToEdit) {
      const prod = products.find((p) => p.id === productIdToEdit);
      if (prod) {
        setValue('code', prod.code);
        setValue('location', prod.location);
        setValue('expiryDate', prod.expiryDate);
        setValue('addedDate', prod.addedDate.split('T')[0]);
        setValue('observations', prod.observations || '');
      }
    } else {
      reset({
        code: '',
        location: 'Heladera 1',
        expiryDate: '',
        addedDate: new Date().toISOString().split('T')[0],
        observations: '',
      });
    }
  }, [productIdToEdit, products, setValue, reset, isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (values: ProductFormValues) => {
    try {
      await saveProduct({
        id: productIdToEdit || crypto.randomUUID(),
        code: values.code,
        location: values.location,
        expiryDate: values.expiryDate,
        addedDate: new Date(values.addedDate + 'T12:00:00').toISOString(),
        observations: values.observations,
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

            {/* Location selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-1">
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
