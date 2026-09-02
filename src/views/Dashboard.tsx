import React, { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useAudio } from '../hooks/useAudio';
import { 
  Calendar, 
  ChevronRight, 
  Clock, 
  Info,
  Trash2,
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Printer,
  Bell,
  ListChecks,
  RotateCcw
} from 'lucide-react';
import { formatDistanceToNow, differenceInCalendarDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTuesdayControlStatus } from '../utils/tuesdayControl';
import { printProductLabel } from '../utils/labelPrinter';

interface DashboardProps {
  setView: (view: string) => void;
  onEditProduct: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView, onEditProduct }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { playSuccess, playWarning } = useAudio();
  
  const { 
    products, 
    getDashboardStats, 
    getAlerts, 
    discardProduct,
    setFilterStatusType,
    toggleProductCheck,
    markAllChecks
  } = useApp();
  
  const { permission, requestPermission, checkAndNotifyUpcomingExpirations } = useNotifications();
  const [listFilter, setListFilter] = useState<'todos' | 'alertas' | 'pendientes'>('todos');
  const stats = getDashboardStats();
  const alerts = getAlerts();

  // Checklist Verification calculations
  const activeProductsForControl = products.filter(p => !p.isDiscarded);
  const totalActiveControl = activeProductsForControl.length;
  const loadedActiveControl = activeProductsForControl.filter(p => getTuesdayControlStatus(p).isLoaded).length;
  const pendingActiveControl = totalActiveControl - loadedActiveControl;
  const controlProgress = totalActiveControl > 0 ? Math.round((loadedActiveControl / totalActiveControl) * 100) : 100;

  // Send local notifications when app opens / mounts on dashboard
  useEffect(() => {
    if (products.length > 0) {
      checkAndNotifyUpcomingExpirations(products);
    }
  }, [products, checkAndNotifyUpcomingExpirations]);

  // Handle viewing upcoming expirations in main history
  const handleViewUpcomingInHistory = () => {
    setFilterStatusType('proximos');
    setView('history');
  };

  const handleToggleCheck = async (productId: string) => {
    await toggleProductCheck(productId);
    playSuccess();
  };

  const handleResetChecklist = async () => {
    if (window.confirm('¿Deseas marcar todos los productos como pendientes de verificación?')) {
      await markAllChecks(false);
      playWarning();
    }
  };

  const handleVerifyAll = async () => {
    if (window.confirm('¿Deseas marcar todos los productos como verificados?')) {
      await markAllChecks(true);
      playSuccess();
    }
  };

  // Get active products (not discarded) sorted by date
  const sortedActiveProducts = products
    .filter(p => !p.isDiscarded)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  // Filter list based on selected tab
  const displayedProducts = sortedActiveProducts.filter(p => {
    if (listFilter === 'alertas') {
      return ['vencido', 'vence_hoy', 'vence_manana', 'vence_2_dias', 'vence_3_dias', 'vence_7_dias', 'proximo'].includes(p.status);
    }
    if (listFilter === 'pendientes') {
      return p.isChecked === false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Push Notification Enable Banner */}
      {permission === 'default' && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-3xl shadow-md border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF1744]/20 text-[#FF1744] rounded-2xl shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Activa las alertas diarias de vencimiento</h4>
              <p className="text-[11px] text-slate-300">Recibe notificaciones automáticas cada mañana con avisos a 7 días y 1 día antes del vencimiento para cargar productos.</p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="px-4 py-2.5 bg-[#FF1744] hover:bg-red-600 text-white font-extrabold text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <span>🔔 Activar Alertas</span>
          </button>
        </div>
      )}

      {/* Welcome, Alerts & Checklist Control Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Welcome Box */}
        <div className="bg-gradient-to-r from-[#FF1744] to-red-650 p-6 rounded-3xl text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isAdmin ? 'bg-amber-400 text-slate-900 shadow-sm' : 'bg-white/20 text-white backdrop-blur-sm'
              }`}>
                {isAdmin ? '👑 MODO ADMINISTRADOR' : '👤 MODO EMPLEADO OPERATIVO'}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold mb-1">¡Hola, {user?.username || 'Sucursal'}!</h2>
            <p className="text-white/80 text-xs font-medium">
              {isAdmin 
                ? 'Gestión total de vencimientos, checklist de control y sincronización nube.' 
                : 'Control operativo de cargas y checklist de verificación en sucursal.'}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={handleViewUpcomingInHistory}
              className="bg-white text-[#FF1744] text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Ver próximos vencimientos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actionable Alerts Panel */}
        {(alerts.vencidosCount > 0 || alerts.hoyCount > 0 || alerts.mananaCount > 0 || alerts.sieteDiasCount > 0) ? (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Alertas y Avisos de Carga</h3>
              </div>
              <div className="space-y-2">
                {alerts.vencidosCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span>⚠️ Hay {alerts.vencidosCount} {alerts.vencidosCount === 1 ? 'producto vencido' : 'productos vencidos'}.</span>
                  </div>
                )}
                {alerts.hoyCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span>⚠️ Hay {alerts.hoyCount} {alerts.hoyCount === 1 ? 'producto que vence' : 'productos que vencen'} hoy.</span>
                  </div>
                )}
                {alerts.mananaCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                    <span>🟠 Hay {alerts.mananaCount} {alerts.mananaCount === 1 ? 'producto a 1 día de vencer (¡Cargar hoy!)' : 'productos a 1 día de vencer (¡Cargar hoy!)'}.</span>
                  </div>
                )}
                {alerts.sieteDiasCount > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>📅 Hay {alerts.sieteDiasCount} {alerts.sieteDiasCount === 1 ? 'producto a 7 días de vencer (Aviso de carga)' : 'productos a 7 días de vencer (Aviso de carga)'}.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 mt-4 italic font-medium">
              Avisos automáticos a 7 días y 1 día antes del vencimiento.
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-3xl border border-green-100 dark:border-green-900/30 flex flex-col justify-center items-center text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
            <h4 className="font-bold text-sm text-green-800 dark:text-green-400">¡Todo al día!</h4>
            <p className="text-xs text-green-650 dark:text-green-450 mt-1 max-w-xs">No hay productos vencidos ni con alertas de carga a 7 días o 1 día.</p>
          </div>
        )}

        {/* Persistent Checklist Control Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-sm text-slate-850 dark:text-white">Checklist de Verificación</h3>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleVerifyAll}
                    title="Marcar todos como verificados"
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer rounded"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetChecklist}
                    title="Reiniciar checklist (marcar pendientes)"
                    className="p-1 text-slate-400 hover:text-orange-500 transition-all cursor-pointer rounded"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                {pendingActiveControl === 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>¡Todos los productos verificados y al día!</span>
                  </span>
                ) : (
                  <span>
                    Hay <strong className="text-orange-600 dark:text-orange-400 font-bold">{pendingActiveControl}</strong> producto{pendingActiveControl === 1 ? '' : 's'} pendiente{pendingActiveControl === 1 ? '' : 's'} de verificación.
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                  <span>Progreso de Verificación</span>
                  <span>{loadedActiveControl} / {totalActiveControl} ({controlProgress}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500 bg-emerald-500" 
                    style={{ width: `${controlProgress}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 text-[10px] text-slate-400 dark:text-slate-400 font-medium">
            <span>Control manual persistente</span>
            <button
              onClick={() => setListFilter(listFilter === 'pendientes' ? 'todos' : 'pendientes')}
              className="text-[#FF1744] hover:underline font-bold cursor-pointer"
            >
              {listFilter === 'pendientes' ? 'Ver todos' : `Ver ${pendingActiveControl} pendientes`}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Vencidos Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Vencidos</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-red-600 dark:text-red-500">{stats.vencidos}</span>
            <span className="text-xs text-slate-400">un.</span>
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
            <span className="text-xs text-slate-400">un.</span>
          </div>
          <div className="w-full bg-yellow-100 dark:bg-yellow-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-yellow-500 h-full" style={{ width: `${stats.total > 0 ? (stats.venceHoy / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* 1 Día (Mañana) Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-orange-200 dark:border-orange-500/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">A 1 Día (Mañana)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-orange-500 dark:text-orange-400">{alerts.mananaCount}</span>
            <span className="text-xs text-slate-400">un.</span>
          </div>
          <div className="w-full bg-orange-100 dark:bg-orange-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: `${stats.total > 0 ? (alerts.mananaCount / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* 7 Días Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-200 dark:border-blue-500/30 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">A 7 Días (Carga)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.vence7Dias}</span>
            <span className="text-xs text-slate-400">un.</span>
          </div>
          <div className="w-full bg-blue-100 dark:bg-blue-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${stats.total > 0 ? (stats.vence7Dias / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Vigentes Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Vigentes</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-green-600 dark:text-green-500">{stats.vigentes}</span>
            <span className="text-xs text-slate-400">un.</span>
          </div>
          <div className="w-full bg-green-100 dark:bg-green-500/10 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${stats.total > 0 ? (stats.vigentes / stats.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Total Stock</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</span>
            <span className="text-xs text-slate-400">un.</span>
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
            <h3 className="text-lg font-extrabold text-slate-850 dark:text-white">Próximos Vencimientos y Checklist</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Ordenados automáticamente por la fecha de vencimiento más cercana.</p>
          </div>
          
          {/* List display toggles */}
          <div className="flex flex-wrap bg-slate-100 dark:bg-slate-700 p-1 rounded-xl self-start gap-1">
            <button
              onClick={() => setListFilter('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listFilter === 'todos' 
                  ? 'bg-white text-slate-850 shadow-sm dark:bg-slate-800 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Todos ({sortedActiveProducts.length})
            </button>
            <button
              onClick={() => setListFilter('alertas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listFilter === 'alertas' 
                  ? 'bg-white text-slate-850 shadow-sm dark:bg-slate-800 dark:text-white' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Alertas ({sortedActiveProducts.filter(p => p.status !== 'vigente').length})
            </button>
            <button
              onClick={() => setListFilter('pendientes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listFilter === 'pendientes' 
                  ? 'bg-white text-orange-600 shadow-sm dark:bg-slate-800 dark:text-orange-400' 
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Pendientes ({pendingActiveControl})
            </button>
          </div>
        </div>

        {/* Display List */}
        {displayedProducts.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto pr-1">
            {displayedProducts.map((product) => {
              const isVerified = product.isChecked !== false;
              const dateDiff = differenceInCalendarDays(
                startOfDay(new Date(product.expiryDate + 'T00:00:00')), 
                startOfDay(new Date())
              );
              
              return (
                <div key={product.id} className="py-4 flex items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-700/10 px-2 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    {/* Quick Checklist Toggle Button */}
                    <button
                      onClick={() => handleToggleCheck(product.id)}
                      className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                        isVerified 
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/20' 
                          : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={isVerified ? 'Verificado en checklist (clic para desmarcar)' : 'Pendiente de verificar (clic para marcar verificado)'}
                    >
                      {isVerified ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-500/20 stroke-[2.5]" />
                      ) : (
                        <Circle className="w-5 h-5 stroke-[2]" />
                      )}
                    </button>

                    {/* Expiry color marker */}
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      product.status === 'vencido' || dateDiff < 0 ? 'bg-[#FF1744]' :
                      product.status === 'vence_hoy' || dateDiff === 0 ? 'bg-yellow-500' :
                      product.status === 'vence_manana' || dateDiff === 1 ? 'bg-orange-500' :
                      ['vence_2_dias', 'vence_3_dias'].includes(product.status) || (dateDiff >= 2 && dateDiff <= 3) ? 'bg-orange-400' :
                      product.status === 'vence_7_dias' || dateDiff === 7 ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white">
                          #{product.code}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded">
                          {product.location}
                        </span>
                        {dateDiff === 7 && (
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                            📅 7 días (Cargar)
                          </span>
                        )}
                        {dateDiff === 1 && (
                          <span className="text-[10px] bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold px-2 py-0.5 rounded border border-orange-200 dark:border-orange-500/20 animate-pulse">
                            🟠 1 día (Cargar)
                          </span>
                        )}
                        {product.unit === 'kg' || product.weight !== undefined ? (
                          <span className="text-[10px] bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold px-2 py-0.5 rounded border border-red-200 dark:border-red-500/20">
                            ⚖️ {product.weight !== undefined ? `${product.weight} Kg` : 'Por peso'} {product.quantity > 1 ? `(${product.quantity} pzs)` : ''}
                          </span>
                        ) : product.quantity > 1 ? (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-350 font-bold px-2 py-0.5 rounded">
                            📦 {product.quantity} un.
                          </span>
                        ) : null}
                        {/* Checklist Verification Badge */}
                        <button
                          onClick={() => handleToggleCheck(product.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
                            isVerified 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-550/10 dark:text-emerald-400' 
                              : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                          <span>{isVerified ? 'Verificado' : 'Pendiente'}</span>
                        </button>
                      </div>
                      
                      {/* Sub-details */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Vence: {new Date(product.expiryDate + 'T00:00:00').toLocaleDateString()}</span>
                        </span>
                        {product.costPrice && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Costo: ${product.costPrice}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>Cargado por: {product.addedBy}</span>
                        {product.checkedBy && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Chequeado por: {product.checkedBy}
                            </span>
                          </>
                        )}
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
                      {/* Print Label Button */}
                      <button
                        onClick={() => printProductLabel(product)}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                        title="Imprimir Etiqueta"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => onEditProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                        title="Editar Producto"
                      >
                        <Clock className="w-4 h-4" />
                      </button>

                      {/* Discard Button */}
                      <button
                        onClick={async () => {
                          if (window.confirm(`¿Seguro que deseas marcar como descartado el producto #${product.code}?`)) {
                            await discardProduct(product.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Descartar Producto"
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
          <div className="text-center py-12 text-slate-400">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-sm">No hay productos en esta categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
};
