import { createClient } from '@supabase/supabase-js';
import { dbService, initDB } from './db';
import type { Product, AuditLog, User, AppConfig } from './db';
import type { SyncResult } from './firebase';

export const supabaseService = {
  // Check if internet is available
  isOnline(): boolean {
    return navigator.onLine;
  },

  // Sync products, audit logs, users, and config with Supabase
  async syncData(supabaseConfig: { url: string; anonKey: string }): Promise<SyncResult> {
    if (!this.isOnline()) {
      return {
        success: false,
        message: 'No hay conexión a Internet. Sincronización pendiente con Supabase.',
        timestamp: new Date().toISOString(),
        syncedCount: 0,
      };
    }

    if (!supabaseConfig || !supabaseConfig.url || !supabaseConfig.anonKey) {
      return {
        success: false,
        message: 'Supabase no está configurado. Ingrese las credenciales en Configuración.',
        timestamp: new Date().toISOString(),
        syncedCount: 0,
      };
    }

    try {
      // 1. Initialize Supabase client dynamically
      const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

      // 2. Fetch local data from IndexedDB
      const localProducts = await dbService.getAllProducts();
      const localLogs = await dbService.getAuditLogs();
      const localUsers = await dbService.getUsers();
      const localConfig = await dbService.getConfig();

      // 3. Fetch remote data from Supabase
      let remoteProducts: Product[] = [];
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        remoteProducts = data || [];
      } catch (e) {
        console.warn('No se pudieron leer productos de Supabase:', e);
      }

      let remoteLogs: AuditLog[] = [];
      try {
        const { data, error } = await supabase.from('audit_logs').select('*');
        if (error) throw error;
        remoteLogs = data || [];
      } catch (e) {
        console.warn('No se pudieron leer logs de Supabase:', e);
      }

      let remoteUsers: User[] = [];
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        remoteUsers = data || [];
      } catch (e) {
        console.warn('No se pudieron leer usuarios de Supabase:', e);
      }

      let remoteConfig: AppConfig | undefined = undefined;
      try {
        const { data, error } = await supabase.from('config').select('*').eq('key', 'settings').single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for no rows returned
        if (data) {
          remoteConfig = {
            key: 'settings',
            ...data
          } as AppConfig;
        }
      } catch (e) {
        console.warn('No se pudo leer la configuración de Supabase:', e);
      }

      // Preparation for batch operations in Supabase
      const productsToUpsert: Product[] = [];
      const productsToDelete: string[] = [];
      const logsToInsert: AuditLog[] = [];
      const usersToUpsert: User[] = [];
      let configToUpsert: any = null;

      let localUpdatesNeeded = false;
      const localProductsToPut: Product[] = [];
      const localProductsToDelete: string[] = [];
      const localLogsToPut: AuditLog[] = [];
      const localUsersToPut: User[] = [];
      let localConfigToPut: AppConfig | null = null;
      let changesCount = 0;

      // 4. Map deletion events from audit logs to avoid resurrecting deleted products
      const deletedProductTimestamps = new Map<string, number>();
      const allLogsForDeletionCheck = [...localLogs, ...remoteLogs];
      for (const log of allLogsForDeletionCheck) {
        if (log.action === 'delete') {
          const logTime = new Date(log.timestamp).getTime();
          const existingTime = deletedProductTimestamps.get(log.productId) || 0;
          if (logTime > existingTime) {
            deletedProductTimestamps.set(log.productId, logTime);
          }
        }
      }

      // 5. Merge Products (Two-Way Sync based on timestamps)
      const localProdMap = new Map<string, Product>();
      localProducts.forEach(p => localProdMap.set(p.id, p));

      const remoteProdMap = new Map<string, Product>();
      remoteProducts.forEach(p => remoteProdMap.set(p.id, p));

      const allProdIds = new Set([...localProdMap.keys(), ...remoteProdMap.keys()]);

      for (const id of allProdIds) {
        const local = localProdMap.get(id);
        const remote = remoteProdMap.get(id);

        // Check if the product was deleted
        const deletionTime = deletedProductTimestamps.get(id);
        if (deletionTime) {
          const localTime = local ? new Date(local.lastUpdated || local.addedDate || 0).getTime() : 0;
          const remoteTime = remote ? new Date(remote.lastUpdated || remote.addedDate || 0).getTime() : 0;
          const maxProductTime = Math.max(localTime, remoteTime);

          if (deletionTime >= maxProductTime) {
            // Delete product on both local and cloud databases if present
            if (remote) {
              productsToDelete.push(id);
              changesCount++;
            }
            if (local) {
              localProductsToDelete.push(id);
              localUpdatesNeeded = true;
            }
            continue; // Skip normal merging
          }
        }

        if (local && !remote) {
          // Upload to Supabase
          productsToUpsert.push(local);
          changesCount++;
        } else if (!local && remote) {
          // Download to IndexedDB
          localProductsToPut.push(remote);
          localUpdatesNeeded = true;
          changesCount++;
        } else if (local && remote) {
          // Both exist, compare modification timestamps
          const localTime = new Date(local.lastUpdated || local.addedDate || 0).getTime();
          const remoteTime = new Date(remote.lastUpdated || remote.addedDate || 0).getTime();

          if (localTime > remoteTime) {
            // Local is newer: upload
            productsToUpsert.push(local);
            changesCount++;
          } else if (remoteTime > localTime) {
            // Remote is newer: download
            localProductsToPut.push(remote);
            localUpdatesNeeded = true;
            changesCount++;
          }
        }
      }

      // 6. Merge Audit Logs (Append-only by ID)
      const localLogIds = new Set(localLogs.map(l => l.id));
      const remoteLogIds = new Set(remoteLogs.map(l => l.id));

      for (const log of localLogs) {
        if (!remoteLogIds.has(log.id)) {
          logsToInsert.push(log);
          changesCount++;
        }
      }
      for (const log of remoteLogs) {
        if (!localLogIds.has(log.id)) {
          localLogsToPut.push(log);
          localUpdatesNeeded = true;
          changesCount++;
        }
      }

      // 7. Merge Users based on modification timestamps
      const localUserMap = new Map<string, User>();
      localUsers.forEach(u => localUserMap.set(u.username, u));

      const remoteUserMap = new Map<string, User>();
      remoteUsers.forEach(u => remoteUserMap.set(u.username, u));

      const allUsernames = new Set([...localUserMap.keys(), ...remoteUserMap.keys()]);

      for (const username of allUsernames) {
        const local = localUserMap.get(username);
        const remote = remoteUserMap.get(username);

        if (local && !remote) {
          // Upload local user
          usersToUpsert.push({
            ...local,
            isDeleted: local.isDeleted ?? false
          });
          changesCount++;
        } else if (!local && remote) {
          // Download remote user
          localUsersToPut.push(remote);
          localUpdatesNeeded = true;
          changesCount++;
        } else if (local && remote) {
          // Compare modification timestamps
          const localTime = new Date(local.lastUpdated || 0).getTime();
          const remoteTime = new Date(remote.lastUpdated || 0).getTime();

          if (localTime > remoteTime) {
            // Local is newer: upload
            usersToUpsert.push({
              ...local,
              isDeleted: local.isDeleted ?? false
            });
            changesCount++;
          } else if (remoteTime > localTime) {
            // Remote is newer: download
            localUsersToPut.push(remote);
            localUpdatesNeeded = true;
            changesCount++;
          }
        }
      }

      // 8. Merge Config Settings
      if (!remoteConfig) {
        // Upload settings
        const { key, alertDays, alertDaysCarnicos, alertDaysEmbutidos, alertDaysLacteos, alertDaysVegetales, soundEnabled, theme } = localConfig;
        configToUpsert = { key, alertDays, alertDaysCarnicos, alertDaysEmbutidos, alertDaysLacteos, alertDaysVegetales, soundEnabled, theme };
        changesCount++;
      } else {
        // Compare and merge configuration values
        const configKeysChanged = 
          localConfig.alertDays !== remoteConfig.alertDays || 
          localConfig.soundEnabled !== remoteConfig.soundEnabled ||
          localConfig.alertDaysCarnicos !== remoteConfig.alertDaysCarnicos ||
          localConfig.alertDaysEmbutidos !== remoteConfig.alertDaysEmbutidos ||
          localConfig.alertDaysLacteos !== remoteConfig.alertDaysLacteos ||
          localConfig.alertDaysVegetales !== remoteConfig.alertDaysVegetales;

        if (configKeysChanged) {
          const mergedConfig: AppConfig = {
            ...localConfig,
            alertDays: remoteConfig.alertDays,
            alertDaysCarnicos: remoteConfig.alertDaysCarnicos ?? localConfig.alertDaysCarnicos,
            alertDaysEmbutidos: remoteConfig.alertDaysEmbutidos ?? localConfig.alertDaysEmbutidos,
            alertDaysLacteos: remoteConfig.alertDaysLacteos ?? localConfig.alertDaysLacteos,
            alertDaysVegetales: remoteConfig.alertDaysVegetales ?? localConfig.alertDaysVegetales,
            soundEnabled: remoteConfig.soundEnabled,
            theme: remoteConfig.theme || localConfig.theme,
          };
          localConfigToPut = mergedConfig;
          localUpdatesNeeded = true;
          changesCount++;
        }
      }

      // 9. Execute batch uploads and deletes in Supabase
      if (changesCount > 0) {
        const uploadPromises = [];
        if (productsToUpsert.length > 0) {
          uploadPromises.push(supabase.from('products').upsert(productsToUpsert));
        }
        if (productsToDelete.length > 0) {
          uploadPromises.push(supabase.from('products').delete().in('id', productsToDelete));
        }
        if (logsToInsert.length > 0) {
          uploadPromises.push(supabase.from('audit_logs').upsert(logsToInsert));
        }
        if (usersToUpsert.length > 0) {
          uploadPromises.push(supabase.from('users').upsert(usersToUpsert));
        }
        if (configToUpsert) {
          uploadPromises.push(supabase.from('config').upsert(configToUpsert));
        }

        const results = await Promise.all(uploadPromises);
        for (const res of results) {
          if (res.error) throw res.error;
        }
      }

      // 10. Write updates to IndexedDB locally
      if (localUpdatesNeeded) {
        const localDb = await initDB();
        const tx = localDb.transaction(['products', 'audit_logs', 'users', 'config'], 'readwrite');
        
        for (const prod of localProductsToPut) {
          await tx.objectStore('products').put(prod);
        }
        for (const id of localProductsToDelete) {
          await tx.objectStore('products').delete(id);
        }
        for (const log of localLogsToPut) {
          await tx.objectStore('audit_logs').put(log);
        }
        for (const user of localUsersToPut) {
          await tx.objectStore('users').put(user);
        }
        if (localConfigToPut) {
          await tx.objectStore('config').put(localConfigToPut);
        }
        await tx.done;
      }

      return {
        success: true,
        message: changesCount > 0 
          ? `Sincronización con Supabase completada con éxito. Se actualizaron ${changesCount} registros.`
          : 'Sincronización con Supabase completada. Los datos ya estaban al día.',
        timestamp: new Date().toISOString(),
        syncedCount: localProducts.length,
      };

    } catch (error: any) {
      console.error('Supabase Sync Error:', error);
      return {
        success: false,
        message: `Error de sincronización con Supabase: ${error.message || error}`,
        timestamp: new Date().toISOString(),
        syncedCount: 0,
      };
    }
  }
};
