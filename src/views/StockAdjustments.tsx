import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAudio } from '../hooks/useAudio';
import { getTuesdayControlStatus } from '../utils/tuesdayControl';
import { 
  Search, 
  MapPin, 
  Calendar,
  AlertTriangle,
  Sliders,
  X,
  Plus,
  Minus,
  CheckCircle
} from 'lucide-react';

export const StockAdjustments: React.FC = () => {
  const { products, saveProduct, refreshData } = useApp();
  const { playSuccess, playError } = useAudio();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('todos');

  // Adjustment Modal State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustmentType, setAdjustmentType] = useState<'faltante' | 'sobrante'>('faltante');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState('Diferencia de conteo');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Predefined locations (matching ProductForm)
  const locations = [
    'Heladera 1', 'Heladera 2', 'Heladera 3', 'Heladera 4', 'Heladera 5',
    'Heladera 6', 'Heladera 7', 'Heladera 8', 'Heladera 9', 'Heladera 10',
    'Heladera 11', 'Heladera 12', 'Heladera 13', 'Heladera 14', 'Heladera 15',
    'Heladera 16', 'Heladera 17', 'Heladera 18',
    'Freezer 1', 'Freezer 2', 'Freezer 3', 'Freezer 4', 'Freezer 5',
    'Freezer 6', 'Freezer 7', 'Freezer 8'
  ];

  // Predefined reasons
  const reasons = [
    'Diferencia de conteo',
    'Rotura / Daño',
    'Robo / Hurto',
    'Vendido sin escanear',
    'Carga incorrecta',
    'Otro (Especificar)'
  ];

  // Filter products
  const activeProducts = products.filter(p => !p.isDiscarded);
  
  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch = 
      p.code.includes(searchQuery) || 
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesLocation = 
      filterLocation === 'todos' ||
      (filterLocation === 'heladera' && p.location.toLowerCase().includes('heladera')) ||
      (filterLocation === 'freezer' && p.location.toLowerCase().includes('freezer')) ||
      p.location === filterLocation;

    return matchesSearch && matchesLocation;
  });

  const handleOpenAdjustment = (product: any) => {
    setSelectedProduct(product);
    setAdjustmentType('faltante');
    setAdjustmentQuantity(1);
    setAdjustmentReason('Diferencia de conteo');
    setCustomReason('');
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setSuccessMessage(null);
  };

  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (adjustmentQuantity <= 0) {
      alert('La cantidad a ajustar debe ser mayor a 0.');
      playError();
      return;
    }

    setIsSubmitting(true);
    try {
      const currentQty = selectedProduct.quantity ?? 1;
      const change = adjustmentType === 'sobrante' ? adjustmentQuantity : -adjustmentQuantity;
      const newQty = Math.max(0, currentQty + change);

      const finalReason = adjustmentReason === 'Otro (Especificar)' ? customReason : adjustmentReason;
      const formattedReason = finalReason.trim() || 'Sin motivo especificado';

      // Build adjustment log description
      const obsText = `Ajuste de stock: ${change > 0 ? '+' : ''}${change} unidades. Motivo: ${formattedReason}`;

      // Update product quantity and observations
      await saveProduct({
        id: selectedProduct.id,
        code: selectedProduct.code,
        category: selectedProduct.category || 'general',
        location: selectedProduct.location,
        expiryDate: selectedProduct.expiryDate,
        quantity: newQty,
        observations: selectedProduct.observations 
          ? `${selectedProduct.observations} | ${obsText}`
          : obsText,
        addedDate: selectedProduct.addedDate,
      });

      playSuccess();
      setSuccessMessage(`¡Ajuste realizado con éxito! La cantidad cambió de ${currentQty} a ${newQty}.`);
      
      // Delay closing modal slightly so the user sees the confirmation message
      setTimeout(() => {
        handleCloseModal();
        refreshData();
      }, 2000);
    } catch (err) {
      console.error(err);
      playError();
      alert('Ocurrió un error al procesar el ajuste.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-black dark:text-white flex items-center gap-2">
          <Sliders className="w-6 h-6 text-[#FF1744]" />
          <span>Ajustes de Stock e Inventario</span>
        </h2>
        <p className="text-xs text-slate-900 dark:text-slate-400 mt-0.5 font-semibold">
          Corrige las cantidades de producto en góndola registrando sobrantes (+) o faltantes (-) de mercadería.
        </p>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código de 5 dígitos, ubicación o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
            />
          </div>

          {/* Location Filter */}
          <div className="w-full md:w-60">
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-semibold"
            >
              <option value="todos">Todas las ubicaciones</option>
              <option value="heladera">Todas las Heladeras</option>
              <option value="freezer">Todos los Freezers</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-extrabold text-sm text-black dark:text-white">Productos en Stock</h3>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-750 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-700">
                <th className="py-3 px-5">Código</th>
                <th className="py-3 px-5">Categoría</th>
                <th className="py-3 px-5">Ubicación</th>
                <th className="py-3 px-5">Fecha Vencimiento</th>
                <th className="py-3 px-5 text-center">Cantidad</th>
                <th className="py-3 px-5">Control Martes</th>
                <th className="py-3 px-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-black dark:text-slate-200">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const tControl = getTuesdayControlStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                      <td className="py-4 px-5 font-bold text-sm text-slate-900 dark:text-white">#{p.code}</td>
                      <td className="py-4 px-5 capitalize">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {p.category || 'general'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#FF1744] shrink-0" />
                          <span>{p.location}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-slate-350">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(p.expiryDate + 'T00:00:00').toLocaleDateString()}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-extrabold text-base text-[#FF1744] dark:text-red-400">
                        {p.quantity ?? 1}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit flex items-center gap-1 ${
                            tControl.isLoaded 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-555/10 dark:text-emerald-400' 
                              : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${tControl.isLoaded ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                            <span>{tControl.isLoaded ? 'Cargado' : 'Pendiente'}</span>
                          </span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-400 font-medium whitespace-nowrap">
                            {tControl.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleOpenAdjustment(p)}
                          className="py-1.5 px-3 bg-[#FF1744]/10 text-[#FF1744] hover:bg-[#FF1744]/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Ajustar Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No se encontraron productos activos en stock para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const tControl = getTuesdayControlStatus(p);
              return (
                <div key={p.id} className="p-4 space-y-3 font-semibold text-xs text-slate-800 dark:text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">#{p.code}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {p.category || 'general'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 dark:text-slate-455">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-400/80">Ubicación</p>
                      <p className="mt-0.5 flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-[#FF1744] shrink-0" />
                        <span>{p.location}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-400/80">Vencimiento</p>
                      <p className="mt-0.5 flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(p.expiryDate + 'T00:00:00').toLocaleDateString()}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-slate-400/80">Control</p>
                      <span className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded w-fit flex items-center gap-1 ${
                        tControl.isLoaded 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-555/10 dark:text-emerald-400' 
                          : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${tControl.isLoaded ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                        <span>{tControl.isLoaded ? 'Cargado' : 'Pendiente'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400/80">Stock:</span>
                        <span className="text-base font-black text-[#FF1744] dark:text-red-400">{p.quantity ?? 1}</span>
                      </div>
                      <span className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">
                        {tControl.label}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleOpenAdjustment(p)}
                      className="py-1.5 px-3.5 bg-[#FF1744]/10 text-[#FF1744] hover:bg-[#FF1744]/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Ajustar Stock
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
              No se encontraron productos activos en stock para los filtros aplicados.
            </div>
          )}
        </div>
      </div>

      {/* Adjustment Dialog Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-[#FF1744] text-white">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                <span>Ajustar Stock - #{selectedProduct.code}</span>
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMessage ? (
              <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 animate-bounce" />
                <h4 className="font-extrabold text-lg text-black dark:text-white">¡Ajuste Guardado!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                  {successMessage}
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmAdjustment} className="p-6 space-y-4 text-xs font-bold">
                {/* Product Summary */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-750 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Información del lote</p>
                  <div className="flex justify-between font-semibold text-black dark:text-slate-350">
                    <span>Ubicación: <span className="font-bold">{selectedProduct.location}</span></span>
                    <span>Vencimiento: <span className="font-bold">{new Date(selectedProduct.expiryDate + 'T00:00:00').toLocaleDateString()}</span></span>
                  </div>
                  <p className="text-slate-800 dark:text-white font-bold text-sm">
                    Stock actual: <span className="text-[#FF1744] dark:text-red-400">{selectedProduct.quantity ?? 1} unidades</span>
                  </p>
                </div>

                {/* Adjustment Type Selector */}
                <div>
                  <label className="block text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-2">Tipo de Ajuste</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('faltante')}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold transition-all ${
                        adjustmentType === 'faltante'
                          ? 'bg-red-500/10 border-red-500 text-red-500 dark:bg-red-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-750 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <Minus className="w-5 h-5" />
                      <span>Faltante / Merma (-)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('sobrante')}
                      className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-bold transition-all ${
                        adjustmentType === 'sobrante'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 dark:bg-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-750 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                      <span>Sobrante / Extra (+)</span>
                    </button>
                  </div>
                </div>

                {/* Adjustment Quantity Input */}
                <div>
                  <label htmlFor="adjust-qty" className="block text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Cantidad a Ajustar</label>
                  <input
                    id="adjust-qty"
                    type="number"
                    min={1}
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] text-sm font-semibold"
                  />
                </div>

                {/* Adjustment Reason Selection */}
                <div>
                  <label htmlFor="adjust-reason" className="block text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Motivo del Ajuste</label>
                  <select
                    id="adjust-reason"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] text-sm font-semibold"
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Custom reason notes (conditional) */}
                {adjustmentReason === 'Otro (Especificar)' && (
                  <div>
                    <label htmlFor="custom-reason" className="block text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1">Especifique el motivo</label>
                    <textarea
                      id="custom-reason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Detalles adicionales del motivo..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] text-sm font-medium"
                    />
                  </div>
                )}

                {/* Alert warning for 0 stock */}
                {adjustmentType === 'faltante' && adjustmentQuantity >= (selectedProduct.quantity ?? 1) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-250 dark:border-amber-500/20 rounded-xl flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                      Atención: El faltante ingresado es igual o mayor al stock actual. El stock final quedará registrado en 0 unidades.
                    </p>
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-350 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-[#FF1744] text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-200 dark:shadow-none text-sm cursor-pointer"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Ajustando...' : 'Confirmar Ajuste'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default StockAdjustments;
