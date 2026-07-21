import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  DollarSign,
  Award
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const Statistics: React.FC = () => {
  const { products } = useApp();

  const activeProducts = products.filter((p) => !p.isDiscarded);

  // 1. Chart: Products by Location
  const locationCounts: Record<string, number> = {};
  // Pre-fill locations to show empty ones too
  const knownLocations = [
    'Heladera 1', 'Heladera 2', 'Heladera 3', 'Heladera 4', 'Heladera 5', 'Heladera 6', 'Heladera 7', 'Heladera 8', 'Heladera 9', 'Heladera 10', 'Heladera 11', 'Heladera 12', 'Heladera 13', 'Heladera 14', 'Heladera 15', 'Heladera 16', 'Heladera 17', 'Heladera 18',
    'Freezer 1', 'Freezer 2', 'Freezer 3', 'Freezer 4', 'Freezer 5', 'Freezer 6', 'Freezer 7', 'Freezer 8'
  ];
  knownLocations.forEach(loc => { locationCounts[loc] = 0; });
  activeProducts.forEach((p) => {
    if (locationCounts[p.location] !== undefined) {
      locationCounts[p.location]++;
    } else {
      locationCounts[p.location] = 1;
    }
  });
  const locationData = Object.keys(locationCounts).map((key) => ({
    name: key,
    Cantidad: locationCounts[key],
  }));

  // 2. Chart: Expired Products by Month (based on expiryDate)
  const expiredProducts = products.filter(p => p.status === 'vencido' && !p.isDiscarded);
  const monthlyCounts: Record<string, number> = {};
  expiredProducts.forEach((p) => {
    try {
      // expiryDate is YYYY-MM-DD
      const date = new Date(p.expiryDate + 'T00:00:00');
      const monthName = format(date, 'MMMM', { locale: es });
      monthlyCounts[monthName] = (monthlyCounts[monthName] || 0) + 1;
    } catch (e) {
      // fallback
    }
  });

  // Ensure we have some monthly names in order if empty
  const monthsOrder = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const currentMonthIndex = new Date().getMonth();
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const idx = (currentMonthIndex - 5 + i + 12) % 12;
    return monthsOrder[idx];
  });

  const expiredData = recentMonths.map((m) => {
    // capitalize month name
    const cap = m.charAt(0).toUpperCase() + m.slice(1);
    return {
      name: cap,
      Vencidos: monthlyCounts[m] || 0,
    };
  });

  // 3. Chart: Products Loaded by Day (last 7 days)
  const dailyCounts: Record<string, number> = {};
  // Pre-fill last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return format(date, 'yyyy-MM-dd');
  }).reverse();

  last7Days.forEach(day => { dailyCounts[day] = 0; });

  products.forEach((p) => {
    try {
      const addedDay = p.addedDate.slice(0, 10); // YYYY-MM-DD
      if (dailyCounts[addedDay] !== undefined) {
        dailyCounts[addedDay]++;
      }
    } catch (e) {
      // ignore
    }
  });

  const dailyData = last7Days.map((day) => {
    const dateObj = new Date(day + 'T00:00:00');
    const label = format(dateObj, 'dd MMM', { locale: es });
    return {
      name: label,
      Cargados: dailyCounts[day],
    };
  });

  // 4. Chart: Products Upcoming Expirations
  const statusCounts = {
    vencidos: activeProducts.filter((p) => p.status === 'vencido').length,
    venceHoy: activeProducts.filter((p) => p.status === 'vence_hoy').length,
    proximos: activeProducts.filter((p) => ['vence_manana', 'vence_2_dias', 'vence_3_dias'].includes(p.status)).length,
    vigentes: activeProducts.filter((p) => p.status === 'vigente').length,
  };

  const statusPieData = [
    { name: 'Vencidos', value: statusCounts.vencidos, color: '#FF1744' }, // Red
    { name: 'Vence Hoy', value: statusCounts.venceHoy, color: '#EAB308' }, // Yellow
    { name: 'En 1-3 días', value: statusCounts.proximos, color: '#F97316' }, // Orange
    { name: 'Vigentes', value: statusCounts.vigentes, color: '#22C55E' }, // Green
  ].filter(item => item.value > 0); // Only show statuses that have values

  // 5. Financial Waste & Category Ranking
  const discardedOrExpired = products.filter(p => p.isDiscarded || p.status === 'vencido');
  const totalFinancialLoss = discardedOrExpired.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.quantity || 1)), 0);
  const activeStockValue = activeProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.quantity || 1)), 0);

  const categoryWaste: Record<string, { count: number; totalCost: number }> = {};
  discardedOrExpired.forEach((p) => {
    const cat = p.category || 'general';
    if (!categoryWaste[cat]) {
      categoryWaste[cat] = { count: 0, totalCost: 0 };
    }
    categoryWaste[cat].count += p.quantity || 1;
    categoryWaste[cat].totalCost += (p.costPrice || 0) * (p.quantity || 1);
  });

  const categoryWasteRanking = Object.keys(categoryWaste)
    .map(cat => ({ category: cat, ...categoryWaste[cat] }))
    .sort((a, b) => b.totalCost - a.totalCost || b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-850 dark:text-white">Panel de Estadísticas y Mermas</h2>
        <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Analíticas visuales y métricas financieras de stock y vencimientos.</p>
      </div>

      {/* Financial Waste Summary KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-3xl text-white shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-extrabold tracking-wider text-white/80">Pérdida por Mermas / Descartes</p>
            <p className="text-3xl font-black mt-1">${totalFinancialLoss.toFixed(2)}</p>
            <p className="text-[11px] text-white/70 mt-1">{discardedOrExpired.length} productos vencidos / descartados</p>
          </div>
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl text-white shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-extrabold tracking-wider text-white/80">Valor Total en Stock Activo</p>
            <p className="text-3xl font-black mt-1">${activeStockValue.toFixed(2)}</p>
            <p className="text-[11px] text-white/70 mt-1">{activeProducts.length} productos vigentes en sucursal</p>
          </div>
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {activeProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <AlertCircle className="w-10 h-10 text-slate-350 mx-auto mb-2" />
          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No hay datos suficientes para generar gráficos.</p>
          <p className="text-xs text-slate-400 mt-1">Registra productos para poder visualizar los reportes estadísticos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Products by Location */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#FF1744]" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Productos por Ubicación</h3>
            </div>
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                    labelStyle={{ fontSize: 10, color: '#94A3B8' }}
                  />
                  <Bar dataKey="Cantidad" fill="#FF1744" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Products Near Expiry (Pie Chart) */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="w-5 h-5 text-[#FF1744]" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Distribución de Vencimientos</h3>
            </div>
            {statusPieData.length > 0 ? (
              <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="w-1/2 h-full min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="space-y-2 shrink-0">
                  {statusPieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                        {entry.name}: {entry.value} ({Math.round((entry.value / activeProducts.length) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                No hay productos cargados en stock activo.
              </div>
            )}
          </div>

          {/* 3. Products Loaded by Day (Line Chart) */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#FF1744]" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Carga Diaria (Últimos 7 días)</h3>
            </div>
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                    labelStyle={{ fontSize: 10, color: '#94A3B8' }}
                  />
                  <Line type="monotone" dataKey="Cargados" stroke="#FF1744" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Expired products monthly trends */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#FF1744]" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Histórico de Vencidos por Mes</h3>
            </div>
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expiredData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                    labelStyle={{ fontSize: 10, color: '#94A3B8' }}
                  />
                  <Bar dataKey="Vencidos" fill="#FF1744" opacity={0.8} radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. Waste Ranking by Category */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-[#FF1744]" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Ranking de Mermas y Pérdidas por Categoría</h3>
            </div>

            {categoryWasteRanking.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categoryWasteRanking.map((item, idx) => (
                  <div key={item.category} className="p-4 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">#{idx + 1} Categoría</span>
                      <p className="font-extrabold text-sm text-slate-850 dark:text-white capitalize">{item.category}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{item.count} unidades vencidas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-red-500">${item.totalCost.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">Pérdida est.</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay registros de descartes o mermas con costo cargado.</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
