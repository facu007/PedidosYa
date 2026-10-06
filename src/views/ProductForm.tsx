import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '../hooks/useApp';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ConfirmationAnimation } from '../components/ConfirmationAnimation';
import type { Product } from '../services/db';
import { SECTORS } from '../utils/sectors';
import { 
  X, 
  Camera, 
  Save, 
  AlertCircle, 
  FileText, 
  MapPin, 
  CalendarDays,
  Plus,
  Minus,
  Tag,
  Scale,
  DollarSign,
  Layers,
  RefreshCw,
  ShoppingBag,
  RotateCcw
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
  sector: z.string().min(1, 'Seleccione un sector.'),
  category: z.enum(['cárnicos', 'embutidos', 'lácteos', 'vegetales', 'general']),
  location: z.string().min(1, 'Seleccione o ingrese una ubicación.'),
  expiryDate: z.string().min(1, 'Seleccione una fecha de vencimiento.'),
  addedDate: z.string().min(1, 'Seleccione una fecha de carga.'),
  observations: z.string().optional(),
  unit: z.enum(['unidades', 'kg']),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1.'),
  weight: z.number().optional().or(z.nan()),
  costPrice: z.number().optional().or(z.nan()),
  loadCount: z.number().optional().or(z.nan()),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ExtraBatch {
  id: string;
  expiryDate: string;
  quantity: number;
  location: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, productIdToEdit }) => {
  const { user } = useAuth();
  const { saveProduct, markProductAsSold, products, selectedSector } = useApp();
  const { playSuccess, playError } = useAudio();
  const [scannerMode, setScannerMode] = useState<'code' | 'location' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBatchIdToEdit, setActiveBatchIdToEdit] = useState<string | null>(productIdToEdit || null);
  const [extraBatches, setExtraBatches] = useState<ExtraBatch[]>([]);

  // Compute initial sector default
  const defaultSector = (user?.role === 'empleado' && user?.sector)
    ? user.sector
    : (selectedSector !== 'todos' ? selectedSector : 'snack');

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
      sector: defaultSector,
      category: 'general',
      location: 'Heladera 1',
      expiryDate: '',
      addedDate: new Date().toISOString().split('T')[0],
      observations: '',
      unit: 'unidades',
      quantity: 1,
      weight: undefined,
      costPrice: undefined,
      loadCount: 1,
    },
  });

  const selectedCategory = watch('category');
  const selectedUnit = watch('unit');
  const codeValue = watch('code');
  const currentLocation = watch('location');
  const currentQuantity = watch('quantity') ?? 1;
  const currentLoadCount = watch('loadCount') ?? 1;

  const handleStepQuantity = (delta: number) => {
    const nextVal = Math.max(1, (typeof currentQuantity === 'number' && !isNaN(currentQuantity) ? currentQuantity : 1) + delta);
    setValue('quantity', nextVal);
  };

  const handleStepLoadCount = (delta: number) => {
    const nextVal = Math.max(1, (typeof currentLoadCount === 'number' && !isNaN(currentLoadCount) ? currentLoadCount : 1) + delta);
    setValue('loadCount', nextVal);
  };

  // Find all active batches for the current product code
  const existingBatches = React.useMemo(() => {
    if (!codeValue || !codeValue.trim()) return [];
    return products.filter(
      (p) => p.code && p.code.trim() === codeValue.trim() && !p.isDiscarded
    );
  }, [products, codeValue]);

  const loadProductValues = useCallback((prod: Product) => {
    setActiveBatchIdToEdit(prod.id);
    setValue('code', prod.code);
    setValue('sector', prod.sector || defaultSector);
    setValue('category', prod.category || 'general');
    setValue('location', prod.location);
    setValue('expiryDate', prod.expiryDate);
    if (prod.addedDate) {
      setValue('addedDate', prod.addedDate.split('T')[0]);
    }
    setValue('observations', prod.observations || '');
    setValue('unit', prod.unit || (prod.category === 'cárnicos' || prod.weight !== undefined ? 'kg' : 'unidades'));
    setValue('quantity', prod.quantity ?? 1);
    setValue('weight', prod.weight);
    setValue('costPrice', prod.costPrice);
    setValue('loadCount', prod.loadCount ?? 1);
  }, [setValue, defaultSector]);

  const handleStartNewBatch = () => {
    setActiveBatchIdToEdit(null);
    setValue('expiryDate', '');
    setValue('quantity', 1);
    setValue('loadCount', 1);
  };

  const handleAddExtraBatch = () => {
    setExtraBatches((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        expiryDate: '',
        quantity: 1,
        location: currentLocation || 'Heladera 1',
      },
    ]);
  };

  const handleRemoveExtraBatch = (id: string) => {
    setExtraBatches((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateExtraBatch = (id: string, field: 'expiryDate' | 'quantity' | 'location', value: any) => {
    setExtraBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleMarkSoldFromModal = async () => {
    if (!activeBatchIdToEdit) return;
    const currentProd = products.find(p => p.id === activeBatchIdToEdit);
    if (!currentProd) return;

    if (window.confirm(`¿Confirmar que se vendieron TODAS las unidades del lote/producto #${currentProd.code}?`)) {
      await markProductAsSold(activeBatchIdToEdit);
      playSuccess();
      onClose();
    }
  };

  // Auto switch unit to 'kg' when selecting 'cárnicos' if creating a new product
  useEffect(() => {
    if (!activeBatchIdToEdit) {
      if (selectedCategory === 'cárnicos') {
        setValue('unit', 'kg');
      }
    }
  }, [selectedCategory, activeBatchIdToEdit, setValue]);

  // Load product to edit if productIdToEdit changes or reset when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setExtraBatches([]);
    if (productIdToEdit) {
      const prod = products.find((p) => p.id === productIdToEdit);
      if (prod) {
        loadProductValues(prod);
      }
    } else {
      setActiveBatchIdToEdit(null);
      reset({
        code: '',
        sector: defaultSector,
        category: 'general',
        location: 'Heladera 1',
        expiryDate: '',
        addedDate: new Date().toISOString().split('T')[0],
        observations: '',
        unit: 'unidades',
        quantity: 1,
        weight: undefined,
        costPrice: undefined,
        loadCount: 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productIdToEdit]);

  if (!isOpen) return null;

  const onSubmit = async (values: ProductFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const weightVal = values.unit === 'kg' && values.weight !== undefined && values.weight !== null && !isNaN(values.weight) ? values.weight : undefined;
      const costVal = values.costPrice !== undefined && values.costPrice !== null && !isNaN(values.costPrice) ? values.costPrice : undefined;
      const quantityVal = values.quantity && !isNaN(values.quantity) && values.quantity >= 1 ? values.quantity : 1;
      const loadCountVal = typeof values.loadCount === 'number' && !isNaN(values.loadCount) && values.loadCount >= 1 ? values.loadCount : 1;

      const addedDateObj = values.addedDate ? new Date(values.addedDate.includes('T') ? values.addedDate : values.addedDate + 'T12:00:00') : new Date();
      const addedDateISO = isNaN(addedDateObj.getTime()) ? new Date().toISOString() : addedDateObj.toISOString();

      const targetId = activeBatchIdToEdit || crypto.randomUUID();

      // Save primary batch/product
      await saveProduct({
        id: targetId,
        code: values.code.trim(),
        sector: values.sector,
        category: values.category,
        location: values.location,
        expiryDate: values.expiryDate,
        addedDate: addedDateISO,
        observations: values.observations,
        quantity: quantityVal,
        unit: values.unit,
        weight: weightVal,
        costPrice: costVal,
        loadCount: loadCountVal,
      });

      // Save additional batches if user added extra dates in this submission
      for (const extra of extraBatches) {
        if (extra.expiryDate && extra.expiryDate.trim()) {
          await saveProduct({
            id: crypto.randomUUID(),
            code: values.code.trim(),
            sector: values.sector,
            category: values.category,
            location: extra.location || values.location,
            expiryDate: extra.expiryDate,
            addedDate: addedDateISO,
            observations: values.observations ? `${values.observations} (Lote adicional)` : 'Lote adicional',
            quantity: extra.quantity > 0 ? extra.quantity : 1,
            unit: values.unit,
            weight: undefined,
            costPrice: costVal,
          });
        }
      }

      playSuccess();
      setShowConfirmation(true);
    } catch (err) {
      console.error(err);
      playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    if (scannerMode === 'code') {
      const cleanCode = scannedCode.trim();
      setValue('code', cleanCode);
      const existing = products.find(p => p.code && p.code.trim() === cleanCode && !p.isDiscarded);
      if (existing) {
        // Auto fill general metadata (sector, category, etc.) but allow choosing batch
        setValue('sector', existing.sector || defaultSector);
        setValue('category', existing.category || 'general');
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
    const value = e.target.value;
    setValue('code', value, { shouldValidate: errors.code !== undefined });
  };

  const isEditingExisting = Boolean(activeBatchIdToEdit);

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
                    value={codeValue ?? ''}
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

              {/* Existing Batches / Dates Alert & Selector */}
              {existingBatches.length > 0 && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs space-y-2.5 mt-2">
                  <div className="flex items-center justify-between font-extrabold text-slate-800 dark:text-white flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#FF1744] shrink-0" />
                      <span>Lotes / Fechas registradas para este código ({existingBatches.length}):</span>
                    </div>
                    {activeBatchIdToEdit ? (
                      <button
                        type="button"
                        onClick={handleStartNewBatch}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Nueva Fecha / Lote</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                        Modo: Nuevo Lote
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {existingBatches.map((batch) => {
                      const isSelected = activeBatchIdToEdit === batch.id;
                      return (
                        <div
                          key={batch.id}
                          className={`p-2 rounded-xl flex items-center justify-between gap-2 text-[11px] transition-all border ${
                            isSelected
                              ? 'bg-red-50 dark:bg-red-500/10 border-[#FF1744]/40 text-slate-900 dark:text-white font-bold ring-1 ring-[#FF1744]/30'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-[#FF1744]">
                              📅 {new Date(batch.expiryDate + 'T00:00:00').toLocaleDateString()}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              📦 {batch.quantity ?? 1} {batch.unit || 'un.'}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              📍 {batch.location}
                            </span>
                            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-1.5 py-0.2 rounded text-[10px] border border-indigo-200 dark:border-indigo-500/20">
                              📥 {batch.loadCount ?? 1} {(batch.loadCount ?? 1) === 1 ? 'carga' : 'cargas'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isSelected ? (
                              <span className="text-[10px] text-[#FF1744] font-black px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 rounded">
                                Editando
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => loadProductValues(batch)}
                                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Informative message for load confirmation counter */}
              {activeBatchIdToEdit && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 font-medium flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">📥</span>
                    <span>
                      Cargas confirmadas: <strong className="font-extrabold">{products.find(p => p.id === activeBatchIdToEdit)?.loadCount ?? 1}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-lg">
                    Confirmarás la carga #{ (products.find(p => p.id === activeBatchIdToEdit)?.loadCount ?? 1) + 1 }
                  </span>
                </div>
              )}
            </div>

            {/* Sector selector */}
            <div>
              <label className="block text-xs font-bold text-[#000000] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sector Asignado</span>
                </span>
                {user?.role === 'empleado' && user?.sector && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
                    Tu Sector
                  </span>
                )}
              </label>
              <select
                {...register('sector')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold cursor-pointer"
              >
                {SECTORS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.icon} {sec.label}
                  </option>
                ))}
              </select>
              {errors.sector && (
                <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.sector.message}</p>
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
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleStepQuantity(-1)}
                        className="px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm transition-all cursor-pointer"
                        title="Restar 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        {...register('quantity', { valueAsNumber: true })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepQuantity(1)}
                        className="px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm transition-all cursor-pointer"
                        title="Sumar 1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wider mb-1">
                    Cantidad (Unidades)
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(-1)}
                      className="px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm transition-all cursor-pointer"
                      title="Restar 1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      {...register('quantity', { valueAsNumber: true })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(1)}
                      className="px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm transition-all cursor-pointer"
                      title="Sumar 1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {errors.quantity && (
                    <p className="text-xs text-red-500 font-semibold mt-1">{errors.quantity.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Dates Grid (Loading Date & Primary Expiry Date) */}
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
                  <CalendarDays className="w-3.5 h-3.5 text-[#FF1744]" />
                  <span>Fecha de Vencimiento {extraBatches.length > 0 && '(Lote 1)'}</span>
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

            {/* Extra Dates / Multi-Batch Section */}
            <div className="space-y-3 pt-1">
              {extraBatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#FF1744] uppercase tracking-wider flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Otras Fechas de Vencimiento para este Producto ({extraBatches.length})</span>
                    </span>
                  </div>

                  {extraBatches.map((batch, index) => (
                    <div
                      key={batch.id}
                      className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-2 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase">
                          Lote Adicional #{index + 2}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraBatch(batch.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-all cursor-pointer rounded"
                          title="Eliminar este lote adicional"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                            Vencimiento
                          </label>
                          <input
                            type="date"
                            value={batch.expiryDate}
                            onChange={(e) => handleUpdateExtraBatch(batch.id, 'expiryDate', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white font-semibold text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                            Cantidad (un.)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={batch.quantity}
                            onChange={(e) => handleUpdateExtraBatch(batch.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white font-semibold text-xs text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">
                            Ubicación
                          </label>
                          <input
                            type="text"
                            list="locations-list"
                            value={batch.location}
                            placeholder="Ubicación"
                            onChange={(e) => handleUpdateExtraBatch(batch.id, 'location', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white font-semibold text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddExtraBatch}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold transition-all border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF1744]" />
                <span>+ Agregar otra fecha de vencimiento a este producto</span>
              </button>
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

            {/* Veces que fue cargado el vencimiento (Load Count) */}
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200/80 dark:border-indigo-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Veces cargado el vencimiento</span>
                </label>
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md">
                  Carga #{currentLoadCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lleva la cuenta de cuántas veces se confirmó o cargó este vencimiento.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStepLoadCount(-1)}
                  className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm transition-all border border-slate-200 dark:border-slate-600 cursor-pointer shadow-2xs"
                  title="Restar 1 carga"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  {...register('loadCount', { valueAsNumber: true })}
                  className="w-24 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-800 text-black dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all text-sm font-black"
                />
                <button
                  type="button"
                  onClick={() => handleStepLoadCount(1)}
                  className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-extrabold text-sm transition-all border border-slate-200 dark:border-slate-600 cursor-pointer shadow-2xs"
                  title="Sumar 1 carga"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setValue('loadCount', (currentLoadCount || 1) + 1)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1 ml-auto"
                >
                  <span>+1 Carga</span>
                </button>
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

            {/* Option to mark all units as sold if editing existing batch */}
            {isEditingExisting && (
              <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-300">¿Se vendió todo el stock?</h5>
                    <p className="text-[11px] text-emerald-750 dark:text-emerald-450">Marcar que se vendieron todas las unidades de este lote.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleMarkSoldFromModal}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Vendido</span>
                </button>
              </div>
            )}

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
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-[#FF1744] text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-200 dark:shadow-none text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {isEditingExisting 
                        ? 'Guardar Cambios del Lote' 
                        : (existingBatches.length > 0 ? 'Registrar como Nuevo Lote' : 'Registrar Producto')}
                    </span>
                  </>
                )}
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
        message={isEditingExisting ? "¡Lote Actualizado!" : "¡Producto / Lotes Registrados!"}
      />
    </>
  );
};
