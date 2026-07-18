import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/db';
import type { Product, AppConfig, AuditLog } from '../services/db';
import { useAuth } from './AuthContext';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { firebaseService } from '../services/firebase';

interface AppContextType {
  products: Product[];
  auditLogs: AuditLog[];
  config: AppConfig;
  loading: boolean;
  refreshData: (showSpinner?: boolean) => Promise<void>;
  saveProduct: (productData: Omit<Product, 'status' | 'isDiscarded' | 'addedBy'> & { addedDate?: string }) => Promise<void>;
  discardProduct: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveConfig: (newConfig: AppConfig) => Promise<void>;
  importFromExcel: (parsedProducts: Partial<Product>[]) => Promise<{ imported: number; errors: number }>;
  
  // Filtering & Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterLocationType: 'todos' | 'heladera' | 'freezer';
  setFilterLocationType: (type: 'todos' | 'heladera' | 'freezer') => void;
  filterStatusType: 'todos' | 'vigentes' | 'proximos' | 'vencidos';
  setFilterStatusType: (type: 'todos' | 'vigentes' | 'proximos' | 'vencidos') => void;
  filteredProducts: Product[];
  
  // Dashboard & Alerts
  getDashboardStats: () => {
    vigentes: number;
    venceHoy: number;
    vence3Dias: number; // orange colors: vence hoy / mañana / 2 / 3 days
    vencidos: number;
    total: number;
  };
  getAlerts: () => {
    vencidosCount: number;
    hoyCount: number;
    mananaCount: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to calculate product status
export const calculateProductStatus = (expiryDateStr: string, _alertDays: number = 3): Product['status'] => {
  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDateStr + 'T00:00:00'));
  const diff = differenceInCalendarDays(expiry, today);

  if (diff < 0) return 'vencido';
  if (diff === 0) return 'vence_hoy';
  if (diff === 1) return 'vence_manana';
  if (diff === 2) return 'vence_2_dias';
  if (diff === 3) return 'vence_3_dias';
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

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocationType, setFilterLocationType] = useState<'todos' | 'heladera' | 'freezer'>('todos');
  const [filterStatusType, setFilterStatusType] = useState<'todos' | 'vigentes' | 'proximos' | 'vencidos'>('todos');

  const refreshData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const dbConfig = await dbService.getConfig();
      const dbProducts = await dbService.getAllProducts();
      const dbLogs = await dbService.getAuditLogs();
      
      setConfig(dbConfig);
      setAuditLogs(dbLogs);

      // Recalculate status of active products based on config.alertDays
      const updatedProducts = dbProducts.map((p) => {
        if (p.isDiscarded) {
          return { ...p, status: 'descartado' as const };
        }
        return {
          ...p,
          status: calculateProductStatus(p.expiryDate, dbConfig.alertDays),
        };
      });

      setProducts(updatedProducts);
    } catch (e) {
      console.error('Error refreshing data from DB:', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Helper for background sync
  const triggerBackgroundSync = async (currentConfig?: AppConfig) => {
    const cfg = currentConfig || config;
    if (cfg.syncEnabled && cfg.firebaseConfig && navigator.onLine) {
      try {
        console.log('Iniciando sincronización automática en segundo plano...');
        const result = await firebaseService.syncData(cfg.firebaseConfig);
        if (result.success) {
          console.log('Sincronización en segundo plano completada con éxito.');
          await refreshData(false); // Silent refresh
        }
      } catch (e) {
        console.error('Error durante sincronización en segundo plano:', e);
      }
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      await refreshData(true);
      try {
        const dbConfig = await dbService.getConfig();
        if (dbConfig.syncEnabled && dbConfig.firebaseConfig && navigator.onLine) {
          const result = await firebaseService.syncData(dbConfig.firebaseConfig);
          if (result.success) {
            await refreshData(false);
          }
        }
      } catch (e) {
        console.error('Error durante sincronización inicial:', e);
      }
    };
    initLoad();
  }, []);

  const saveProduct = async (productData: Omit<Product, 'status' | 'isDiscarded' | 'addedBy'> & { addedDate?: string }) => {
    const operator = user?.username || 'sistema';
    const status = calculateProductStatus(productData.expiryDate, config.alertDays);
    
    const existingProduct = products.find(p => p.id === productData.id);

    const fullProduct: Product = {
      ...productData,
      addedBy: existingProduct ? existingProduct.addedBy : operator,
      addedDate: productData.addedDate || (existingProduct ? existingProduct.addedDate : new Date().toISOString()),
      status,
      isDiscarded: false,
      lastUpdated: new Date().toISOString(),
    };

    await dbService.saveProduct(fullProduct, operator);
    await refreshData();
    triggerBackgroundSync();
  };

  const discardProduct = async (id: string) => {
    const operator = user?.username || 'sistema';
    await dbService.discardProduct(id, operator);
    await refreshData();
    triggerBackgroundSync();
  };

  const deleteProduct = async (id: string) => {
    const operator = user?.username || 'sistema';
    await dbService.deleteProduct(id, operator);
    await refreshData();
    triggerBackgroundSync();
  };

  const saveConfig = async (newConfig: AppConfig) => {
    await dbService.saveConfig(newConfig);
    await refreshData();
    triggerBackgroundSync(newConfig);
  };

  const importFromExcel = async (parsedProducts: Partial<Product>[]): Promise<{ imported: number; errors: number }> => {
    const operator = user?.username || 'sistema';
    let imported = 0;
    let errors = 0;

    for (const p of parsedProducts) {
      if (p.code && p.location && p.expiryDate) {
        const fullProduct: Product = {
          id: p.id || crypto.randomUUID(),
          code: p.code,
          location: p.location,
          expiryDate: p.expiryDate,
          observations: p.observations || '',
          addedBy: operator,
          addedDate: new Date().toISOString(),
          status: calculateProductStatus(p.expiryDate, config.alertDays),
          isDiscarded: false,
          lastUpdated: new Date().toISOString(),
        };
        await dbService.saveProduct(fullProduct, operator);
        imported++;
      } else {
        errors++;
      }
    }

    if (imported > 0) {
      await refreshData();
      triggerBackgroundSync();
    }

    return { imported, errors };
  };

  // Get Dashboard statistics
  const getDashboardStats = () => {
    const active = products.filter(p => !p.isDiscarded);
    const vigentes = active.filter(p => p.status === 'vigente').length;
    const venceHoy = active.filter(p => p.status === 'vence_hoy').length;
    // Orange alert: vencen en 3 días o menos (mañana, 2 días, 3 días)
    const vence3Dias = active.filter(p => ['vence_manana', 'vence_2_dias', 'vence_3_dias'].includes(p.status)).length;
    const vencidos = active.filter(p => p.status === 'vencido').length;
    
    return {
      vigentes,
      venceHoy,
      vence3Dias,
      vencidos,
      total: active.length,
    };
  };

  // Get Alerts for Welcome Notification Card
  const getAlerts = () => {
    const active = products.filter(p => !p.isDiscarded);
    const vencidosCount = active.filter(p => p.status === 'vencido').length;
    const hoyCount = active.filter(p => p.status === 'vence_hoy').length;
    const mananaCount = active.filter(p => p.status === 'vence_manana').length;

    return {
      vencidosCount,
      hoyCount,
      mananaCount,
    };
  };

  // Filtering Logic
  const filteredProducts = products.filter((p) => {
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
        // proximate means: vence hoy, mañana, en 2 días, en 3 días (everything except vigente, vencido, and descartado)
        if (['vigente', 'vencido', 'descartado'].includes(p.status)) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <AppContext.Provider
      value={{
        products,
        auditLogs,
        config,
        loading,
        refreshData,
        saveProduct,
        discardProduct,
        deleteProduct,
        saveConfig,
        importFromExcel,
        
        searchQuery,
        setSearchQuery,
        filterLocationType,
        setFilterLocationType,
        filterStatusType,
        setFilterStatusType,
        filteredProducts,
        
        getDashboardStats,
        getAlerts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
