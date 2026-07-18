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
  AlertCircle
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
    'Heladera 1', 'Heladera 2', 'Heladera 3', 'Heladera 4',
    'Freezer 1', 'Freezer 2', 'Freezer 3'
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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-850 dark:text-white">Panel de Estadísticas</h2>
        <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Analíticas visuales sobre los vencimientos y el stock de la sucursal.</p>
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

        </div>
      )}
    </div>
  );
};
