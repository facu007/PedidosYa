import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../hooks/useNotifications';
import { 
  Calendar, 
  ChevronRight, 
  Clock, 
  Info,
  Trash2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow, differenceInCalendarDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  setView: (view: string) => void;
  onEditProduct: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView, onEditProduct }) => {
  const { 
    products, 
    getDashboardStats, 
    getAlerts, 
    discardProduct,
    setFilterStatusType
  } = useApp();
  
  const { checkAndNotifyUpcomingExpirations } = useNotifications();
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(false);
  const stats = getDashboardStats();
  const alerts = getAlerts();

  // Send local notifications when app opens / mounts on dashboard
  useEffect(() => {
    if (products.length > 0) {
      checkAndNotifyUpcomingExpirations(products);
    }
  }, [products]);

  // Handle viewing upcoming expirations in main history
  const handleViewUpcomingInHistory = () => {
    setFilterStatusType('proximos');
    setView('history');
  };

  // Get active products (not discarded) sorted by date
  const sortedActiveProducts = products
    .filter(p => !p.isDiscarded)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  // Filter list if showOnlyUpcoming is toggled
  const displayedProducts = showOnlyUpcoming
    ? sortedActiveProducts.filter(p => ['vencido', 'vence_hoy', 'vence_manana', 'vence_2_dias', 'vence_3_dias'].includes(p.status))
    : sortedActiveProducts;

  return (
    <div className="space-y-6">
      {/* Welcome & Alerts Section */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        {/* Welcome Box */}
        <div className="flex-1 bg-gradient-to-r from-[#FF1744] to-red-650 p-6 rounded-3xl text-white shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-extrabold mb-1">¡Hola, Sucursal!</h2>
            <p className="text-white/80 text-xs font-medium">Control de stock refrigerado de PedidosYa.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={handleViewUpcomingInHistory}
              className="bg-white text-[#FF1744] text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Ver próximos vencimientos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actionable Alerts Panel */}
        {(alerts.vencidosCount > 0 || alerts.hoyCount > 0 || alerts.mananaCount > 0) ? (
          <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Alertas de Vencimiento</h3>
              </div>
              <div className="space-y-2">
                {alerts.vencidosCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>⚠️ Hay {alerts.vencidosCount} {alerts.vencidosCount === 1 ? 'producto vencido' : 'productos vencidos'}.</span>
                  </div>
                )}
                {alerts.hoyCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>⚠️ Hay {alerts.hoyCount} {alerts.hoyCount === 1 ? 'producto que vence' : 'productos que vencen'} hoy.</span>
                  </div>
                )}
                {alerts.mananaCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>⚠️ Hay {alerts.mananaCount} {alerts.mananaCount === 1 ? 'producto que vence' : 'productos que vencen'} mañana.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 mt-4 italic font-medium">
              Por favor revise y descarte los productos indicados.
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-green-50 dark:bg-green-950/20 p-6 rounded-3xl border border-green-100 dark:border-green-900/30 flex flex-col justify-center items-center text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
            <h4 className="font-bold text-sm text-green-800 dark:text-green-400">¡Todo al día!</h4>
            <p className="text-xs text-green-650 dark:text-green-450 mt-1 max-w-xs">No hay productos vencidos ni próximos a vencer hoy.</p>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {/* Vencidos Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Vencidos</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-red-600 dark:text-red-500">{stats.vencidos}</span>
            <span className="text-xs text-slate-400">uds</span>
          </div>
          <div className="w-full bg-red-100 dark:bg-red-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#FF1744] h-full" style={{ width: `${stats.total > 0 ? (stats.vencidos / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Vencen Hoy Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Vencen Hoy</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-500">{stats.venceHoy}</span>
            <span className="text-xs text-slate-400">uds</span>
          </div>
          <div className="w-full bg-yellow-100 dark:bg-yellow-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-yellow-550 h-full" style={{ width: `${stats.total > 0 ? (stats.venceHoy / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Vencen 3 Días Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Vencen 1-3 días</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-orange-500 dark:text-orange-500">{stats.vence3Dias}</span>
            <span className="text-xs text-slate-400">uds</span>
          </div>
          <div className="w-full bg-orange-100 dark:bg-orange-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: `${stats.total > 0 ? (stats.vence3Dias / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Vigentes Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Vigentes</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-green-600 dark:text-green-500">{stats.vigentes}</span>
            <span className="text-xs text-slate-400">uds</span>
          </div>
          <div className="w-full bg-green-100 dark:bg-green-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${stats.total > 0 ? (stats.vigentes / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Total Stock</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</span>
            <span className="text-xs text-slate-400">uds</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-750 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-slate-500 h-full" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Expiry ordered list section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-slate-850 dark:text-white">Próximos Vencimientos</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Ordenados automáticamente por la fecha de vencimiento más cercana.</p>
          </div>
          
          {/* List display toggles */}
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl self-start">
            <button
              onClick={() => setShowOnlyUpcoming(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !showOnlyUpcoming 
                  ? 'bg-white text-slate-850 shadow-sm dark:bg-slate-800 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Todos ({sortedActiveProducts.length})
            </button>
            <button
              onClick={() => setShowOnlyUpcoming(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                showOnlyUpcoming 
                  ? 'bg-white text-slate-850 shadow-sm dark:bg-slate-800 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Alertas ({sortedActiveProducts.filter(p => p.status !== 'vigente').length})
            </button>
          </div>
        </div>

        {/* Display List */}
        {displayedProducts.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto pr-1">
            {displayedProducts.map((product) => {
              const dateDiff = differenceInCalendarDays(
                startOfDay(new Date(product.expiryDate + 'T00:00:00')), 
                startOfDay(new Date())
              );
              
              return (
                <div key={product.id} className="py-4 flex items-center justify-between gap-4 group hover:bg-slate-50/50 dark:hover:bg-slate-700/10 px-2 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    {/* Expiry color marker */}
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      product.status === 'vencido' ? 'bg-[#FF1744]' :
                      product.status === 'vence_hoy' ? 'bg-yellow-500' :
                      ['vence_manana', 'vence_2_dias', 'vence_3_dias'].includes(product.status) ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white">
                          #{product.code}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded">
                          {product.location}
                        </span>
                      </div>
                      
                      {/* Sub-details */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Vence: {new Date(product.expiryDate + 'T00:00:00').toLocaleDateString()}</span>
                        </span>
                        <span>•</span>
                        <span>Cargado por: {product.addedBy}</span>
                      </div>
                      
                      {product.observations && (
                        <p className="text-xs italic text-slate-450 dark:text-slate-400/80 mt-1 max-w-sm truncate">
                          Obs: {product.observations}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right hand action buttons */}
                  <div className="flex items-center gap-2">
                    {/* Days indicator */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                        {dateDiff < 0 ? `Vencido hace ${Math.abs(dateDiff)} días` :
                         dateDiff === 0 ? 'Vence Hoy' :
                         dateDiff === 1 ? 'Vence Mañana' : `Vence en ${dateDiff} días`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(product.expiryDate + 'T00:00:00'), { locale: es, addSuffix: true })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Edit Button */}
                      <button
                        onClick={() => onEditProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                        title="Editar Producto"
                      >
                        <Clock className="w-4 h-4" />
                      </button>

                      {/* Discard Button */}
                      <button
                        onClick={() => discardProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-[#FF1744] hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        title="Marcar como descartado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No hay productos registrados en esta categoría.</p>
            <p className="text-xs text-slate-400 mt-1">Usa el botón flotante (+) para registrar un nuevo producto.</p>
          </div>
        )}
      </div>
    </div>
  );
};
