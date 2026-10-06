import React, { useState, useEffect, useCallback } from 'react';
import { dbService, initDB } from '../services/db';
import type { Product, AppConfig, AuditLog } from '../services/db';
import { useAuth } from '../hooks/useAuth';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { syncService } from '../services/syncService';
import { AppContext } from './app.context';

// Helper to calculate product status
const calculateProductStatus = (
  expiryDateStr: string,
  category?: string,
  config?: AppConfig
): Product['status'] => {
  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDateStr + 'T00:00:00'));
  const diff = differenceInCalendarDays(expiry, today);

  if (diff < 0) return 'vencido';
  if (diff === 0) return 'vence_hoy';
  if (diff === 1) return 'vence_manana';
  if (diff === 2) return 'vence_2_dias';
  if (diff === 3) return 'vence_3_dias';
  if (diff <= 7) return 'vence_7_dias';
  if (diff <= 10) return 'vence_10_dias';

  // Determine alert threshold based on category
  let alertDays = config?.alertDays ?? 3;
  if (category === 'cárnicos') alertDays = config?.alertDaysCarnicos ?? 2;
  else if (category === 'embutidos') alertDays = config?.alertDaysEmbutidos ?? 5;
  else if (category === 'lácteos') alertDays = config?.alertDaysLacteos ?? 3;
  else if (category === 'vegetales') alertDays = config?.alertDaysVegetales ?? 1;

  if (diff <= alertDays) {
    return 'proximo';
  }

  return 'vigente';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    key: 'settings',
    alertDays: 3,
    soundEnabled: true,
    theme: 'light',
    syncEnabled: false,
  });
  const [loading, setLoading] = useState(true);

  // Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocationType, setFilterLocationType] = useState<'todos' | 'heladera' | 'freezer'>('todos');
  const [filterStatusType, setFilterStatusType] = useState<'todos' | 'vigentes' | 'proximos' | 'vencidos'>('todos');
  const [filterChecklistType, setFilterChecklistType] = useState<'todos' | 'verificados' | 'pendientes'>('todos');
  const [selectedSector, setSelectedSector] = useState<string>('todos');

  // Compute effective sector based on user profile and role
  // Employees are strictly restricted to their assigned sector
  // Admins can freely select 'todos' or any sector
  const effectiveSector = (user?.role === 'empleado' && user?.sector)
    ? user.sector.toLowerCase()
    : selectedSector.toLowerCase();

  // Products scoped by effective sector
  const scopedProducts = React.useMemo(() => {
    if (effectiveSector === 'todos') {
      return products;
    }
    return products.filter((p) => {
      const pSector = (p.sector || '').toLowerCase().trim();
      return pSector === effectiveSector;
    });
  }, [products, effectiveSector]);

  // Sector Counts for active products across the entire database
  const getSectorCounts = useCallback(() => {
    const active = products.filter(p => !p.isDiscarded);
    const counts: Record<string, number> = {
      todos: active.length,
      snack: 0,
      kiosco: 0,
      desayuno: 0,
      almacen: 0,
      galletas: 0,
      heladeras: 0,
      freezers: 0,
    };
    for (const p of active) {
      const s = (p.sector || '').toLowerCase().trim();
      if (s && counts[s] !== undefined) {
        counts[s]++;
      }
    }
    return counts;
  }, [products]);

  const refreshData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const dbConfig = await dbService.getConfig();
      const dbProducts = await dbService.getAllProducts();
      const dbLogs = await dbService.getAuditLogs();
      
      setConfig(dbConfig);
      setAuditLogs(dbLogs);

      // Recalculate status of active products based on config.alertDays
      const updatedProducts = dbProducts.map((p) => {
        const qty = p.quantity !== undefined && p.quantity !== null ? p.quantity : 1;
        if (p.isDiscarded) {
          const status = (p.isSold || p.status === 'vendido') ? ('vendido' as const) : ('descartado' as const);
          return { ...p, quantity: qty, status };
        }
        return {
          ...p,
          quantity: qty,
          status: calculateProductStatus(p.expiryDate, p.category, dbConfig),
        };
      });

      setProducts(updatedProducts);
    } catch (e) {
      console.error('Error refreshing data from DB:', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Helper for triggering sync manually or programmatically
  const triggerSync = useCallback(async (currentConfig?: AppConfig) => {
    const dbConfig = currentConfig || (await dbService.getConfig());
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const hasEnvSupabase = !!(envUrl && envUrl !== 'YOUR_SUPABASE_URL' && envAnonKey && envAnonKey !== 'YOUR_SUPABASE_ANON_KEY');
    
    if (!dbConfig.syncEnabled && !hasEnvSupabase) return;
    if (!navigator.onLine) return;

    setIsSyncing(true);
    try {
      console.log('Iniciando sincronización de base de datos...');
      const result = await syncService.syncData(dbConfig);
      setLastSyncStatus({
        success: result.success,
        message: result.message,
        timestamp: result.timestamp,
      });

      if (result.success) {
        await refreshData(false); // Silent refresh of local state
      }
    } catch (e: any) {
      console.error('Error durante la sincronización:', e);
      setLastSyncStatus({
        success: false,
        message: `Error al sincronizar: ${e.message || e}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  }, [refreshData]);

  // Initial load and sync
  useEffect(() => {
    const initLoad = async () => {
      await refreshData(true);
      await triggerSync();
    };
    initLoad();
  }, [refreshData, triggerSync]);

  // Periodic Auto-Polling & Visibility Sync Listener (every 20 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync();
      }
    }, 20000); // 20 seconds polling interval

    const handleFocus = () => {
      if (navigator.onLine) {
        triggerSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [triggerSync]);

  // Synchronize theme with DOM globally
  useEffect(() => {
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.theme]);

  const saveProduct = async (productData: Omit<Product, 'status' | 'isDiscarded' | 'addedBy'> & { addedDate?: string }) => {
    const operator = user?.username || 'sistema';
    const status = calculateProductStatus(productData.expiryDate, productData.category, config);
    
    const existingProduct = products.find(p => p.id === productData.id);

    // Determine assigned sector
    let assignedSector = productData.sector;
    if (!assignedSector) {
      if (user?.role === 'empleado' && user?.sector) {
        assignedSector = user.sector;
      } else if (existingProduct?.sector) {
        assignedSector = existingProduct.sector;
      } else if (selectedSector !== 'todos') {
        assignedSector = selectedSector;
      } else {
        assignedSector = 'snack';
      }
    }

    // Compute loadCount: if explicitly provided, use it. Otherwise, increment if existing or initialize to 1.
    const loadCount = productData.loadCount !== undefined
      ? productData.loadCount
      : (existingProduct ? (existingProduct.loadCount ?? 1) + 1 : 1);

    const fullProduct: Product = {
      ...productData,
      sector: assignedSector,
      quantity: productData.quantity ?? (existingProduct ? existingProduct.quantity : 1),
      unit: productData.unit || (existingProduct ? existingProduct.unit : (productData.category === 'cárnicos' || productData.weight !== undefined ? 'kg' : 'unidades')),
      weight: productData.weight !== undefined ? productData.weight : (existingProduct ? existingProduct.weight : undefined),
      addedBy: existingProduct ? existingProduct.addedBy : operator,
      addedDate: productData.addedDate || (existingProduct ? existingProduct.addedDate : new Date().toISOString()),
      status,
      isDiscarded: false,
      isChecked: productData.isChecked !== undefined ? productData.isChecked : (existingProduct ? (existingProduct.isChecked ?? true) : true),
      checkedAt: productData.checkedAt || (existingProduct ? existingProduct.checkedAt : new Date().toISOString()),
      checkedBy: productData.checkedBy || (existingProduct ? existingProduct.checkedBy : operator),
      lastUpdated: new Date().toISOString(),
      loadCount,
    };

    await dbService.saveProduct(fullProduct, operator);
    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));
  };

  const toggleProductCheck = async (productId: string, forceStatus?: boolean) => {
    const operator = user?.username || 'sistema';
    await dbService.toggleProductCheck(productId, operator, forceStatus);
    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));
  };

  const markAllChecks = async (verified: boolean) => {
    const operator = user?.username || 'sistema';
    await dbService.markAllChecks(verified, operator);
    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));
  };

  const discardProduct = async (id: string) => {
    const operator = user?.username || 'sistema';
    await dbService.discardProduct(id, operator);
    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));
  };

  const markProductAsSold = async (id: string) => {
    const operator = user?.username || 'sistema';
    await dbService.markProductAsSold(id, operator);
    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));
  };

  const incrementProductLoadCount = async (id: string, newCount?: number): Promise<number> => {
    const operator = user?.username || 'sistema';
    const updated = await dbService.incrementProductLoadCount(id, operator, newCount);
    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));
    return updated;
  };

  const deleteProduct = async (id: string) => {
    const operator = user?.username || 'sistema';
    await dbService.deleteProduct(id, operator);
    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));
  };

  const saveConfig = async (newConfig: AppConfig) => {
    await dbService.saveConfig(newConfig);
    await refreshData(false);
    triggerSync(newConfig).catch((err) => console.warn('Background sync warning:', err));
  };

  const importFromExcel = async (parsedProducts: Partial<Product>[]): Promise<{ imported: number; errors: number }> => {
    return reintegrateFromExcel(parsedProducts, 'merge');
  };

  const reintegrateFromExcel = async (parsedProducts: Partial<Product>[], mode: 'merge' | 'replace' = 'merge'): Promise<{ imported: number; errors: number }> => {
    const operator = user?.username || 'sistema';
    let imported = 0;
    let errors = 0;

    const db = await initDB();
    const tx = db.transaction(['products', 'audit_logs'], 'readwrite');
    const productStore = tx.objectStore('products');
    const auditStore = tx.objectStore('audit_logs');

    if (mode === 'replace') {
      await productStore.clear();
    }

    const now = new Date().toISOString();

    for (const p of parsedProducts) {
      if (p.code && p.location && p.expiryDate) {
        const id = p.id || crypto.randomUUID();
        const fullProduct: Product = {
          id,
          code: p.code,
          category: p.category || 'general',
          sector: p.sector || (user?.role === 'empleado' && user?.sector ? user.sector : (selectedSector !== 'todos' ? selectedSector : 'snack')),
          location: p.location,
          expiryDate: p.expiryDate,
          quantity: p.quantity ?? 1,
          unit: p.unit || (p.category === 'cárnicos' || p.weight !== undefined ? 'kg' : 'unidades'),
          weight: p.weight,
          costPrice: p.costPrice,
          observations: p.observations || '',
          addedBy: p.addedBy || operator,
          addedDate: p.addedDate || now,
          status: calculateProductStatus(p.expiryDate, p.category, config),
          isDiscarded: false,
          isChecked: p.isChecked !== undefined ? p.isChecked : true,
          checkedAt: now,
          checkedBy: operator,
          lastUpdated: now,
          loadCount: p.loadCount ?? 1,
        };
        await productStore.put(fullProduct);
        imported++;
      } else {
        errors++;
      }
    }

    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      productId: 'excel-reintegrate',
      productCode: 'EXCEL',
      action: 'create',
      user: operator,
      timestamp: now,
      details: `Reintegración masiva desde Excel: ${imported} productos procesados (modo: ${mode})`,
    };
    await auditStore.put(auditLog);
    await tx.done;

    await refreshData(false);
    triggerSync().catch((err) => console.warn('Background sync warning:', err));

    return { imported, errors };
  };

  // Get Dashboard statistics scoped to the effective sector
  // Conteo acumulativo de días hacia abajo hasta estar vencido:
  const getDashboardStats = () => {
    const today = startOfDay(new Date());
    const active = scopedProducts.filter(p => !p.isDiscarded);
    
    const vencidos = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) < 0).length;
    const venceHoy = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 0).length;
    const venceManana = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 1).length;
    const vence3Dias = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 3).length;
    const vence7Dias = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 7).length;
    const vence10Dias = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 10).length;
    const vigentes = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) > 10).length;
    
    return {
      vigentes,
      venceHoy,
      venceManana,
      vence3Dias,
      vence7Dias,
      vence10Dias,
      vencidos,
      total: active.length,
    };
  };

  // Get Alerts for Welcome Notification Card scoped to the effective sector
  // Referencias acumulativas hacia abajo hasta estar vencido
  const getAlerts = () => {
    const today = startOfDay(new Date());
    const active = scopedProducts.filter(p => !p.isDiscarded);
    const vencidosCount = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) < 0).length;
    const hoyCount = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 0).length;
    const mananaCount = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 1).length;
    const sieteDiasCount = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 7).length;
    const diezDiasCount = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 10).length;

    return {
      vencidosCount,
      hoyCount,
      mananaCount,
      sieteDiasCount,
      diezDiasCount,
    };
  };

  // Filtering Logic based on scopedProducts
  const filteredProducts = scopedProducts.filter((p) => {
    // 1. Search Query (last 5 digits of code)
    if (searchQuery.trim() !== '') {
      if (!p.code.includes(searchQuery.trim())) {
        return false;
      }
    }

    // 2. Location Type Filter
    if (filterLocationType !== 'todos') {
      const loc = p.location.toLowerCase();
      if (filterLocationType === 'heladera' && !loc.includes('heladera')) {
        return false;
      }
      if (filterLocationType === 'freezer' && !loc.includes('freezer')) {
        return false;
      }
    }

    // 3. Status Type Filter
    if (filterStatusType !== 'todos') {
      if (filterStatusType === 'vigentes' && p.status !== 'vigente') {
        return false;
      }
      if (filterStatusType === 'vencidos' && p.status !== 'vencido') {
        return false;
      }
      if (filterStatusType === 'proximos') {
        // proximate means: anything not strictly 'vigente' and not 'descartado'
        if (['vigente', 'descartado'].includes(p.status)) {
          return false;
        }
      }
    }

    // 4. Checklist Verification Filter
    if (filterChecklistType !== 'todos') {
      const isVerified = p.isChecked !== false;
      if (filterChecklistType === 'verificados' && !isVerified) {
        return false;
      }
      if (filterChecklistType === 'pendientes' && isVerified) {
        return false;
      }
    }

    return true;
  });

  return (
    <AppContext.Provider
      value={{
        products: scopedProducts,
        allProducts: products,
        auditLogs,
        config,
        loading,
        refreshData,
        saveProduct,
        discardProduct,
        markProductAsSold,
        incrementProductLoadCount,
        deleteProduct,
        toggleProductCheck,
        markAllChecks,
        saveConfig,
        importFromExcel,
        reintegrateFromExcel,
        
        searchQuery,
        setSearchQuery,
        filterLocationType,
        setFilterLocationType,
        filterStatusType,
        setFilterStatusType,
        filterChecklistType,
        setFilterChecklistType,
        selectedSector,
        setSelectedSector,
        effectiveSector,
        filteredProducts,
        getSectorCounts,
        
        getDashboardStats,
        getAlerts,
        triggerSync,
        isSyncing,
        lastSyncStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
