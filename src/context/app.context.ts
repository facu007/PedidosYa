import { createContext } from 'react';
import type { AppConfig, AuditLog, Product } from '../services/db';

export interface AppContextType {
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
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterLocationType: 'todos' | 'heladera' | 'freezer';
  setFilterLocationType: (type: 'todos' | 'heladera' | 'freezer') => void;
  filterStatusType: 'todos' | 'vigentes' | 'proximos' | 'vencidos';
  setFilterStatusType: (type: 'todos' | 'vigentes' | 'proximos' | 'vencidos') => void;
  filteredProducts: Product[];
  getDashboardStats: () => {
    vigentes: number;
    venceHoy: number;
    vence3Dias: number;
    vencidos: number;
    total: number;
  };
  getAlerts: () => {
    vencidosCount: number;
    hoyCount: number;
    mananaCount: number;
  };
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncStatus: { success: boolean; message: string; timestamp?: string } | null;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
