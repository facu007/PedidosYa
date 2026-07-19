import { firebaseService } from './firebase';
import { supabaseService } from './supabase';
import type { AppConfig } from './db';
import type { SyncResult } from './firebase';

export const syncService = {
  isOnline(): boolean {
    return navigator.onLine;
  },

  async syncData(config: AppConfig): Promise<SyncResult> {
    if (!config.syncEnabled) {
      return {
        success: false,
        message: 'La sincronización automática está desactivada.',
        timestamp: new Date().toISOString(),
        syncedCount: 0,
      };
    }

    if (!this.isOnline()) {
      return {
        success: false,
        message: 'No hay conexión a Internet. Sincronización pendiente.',
        timestamp: new Date().toISOString(),
        syncedCount: 0,
      };
    }

    const provider = config.syncProvider || 'firebase';

    if (provider === 'firebase') {
      if (!config.firebaseConfig || !config.firebaseConfig.apiKey || !config.firebaseConfig.projectId) {
        return {
          success: false,
          message: 'Firebase no está configurado. Ingrese las credenciales en Configuración.',
          timestamp: new Date().toISOString(),
          syncedCount: 0,
        };
      }
      return firebaseService.syncData(config.firebaseConfig);
    } else if (provider === 'supabase') {
      if (!config.supabaseConfig || !config.supabaseConfig.url || !config.supabaseConfig.anonKey) {
        return {
          success: false,
          message: 'Supabase no está configurado. Ingrese las credenciales en Configuración.',
          timestamp: new Date().toISOString(),
          syncedCount: 0,
        };
      }
      return supabaseService.syncData(config.supabaseConfig);
    }

    return {
      success: false,
      message: 'Proveedor de sincronización no reconocido.',
      timestamp: new Date().toISOString(),
      syncedCount: 0,
    };
  }
};
