import { openDB } from 'idb';
import type { DBSchema } from 'idb';

export interface Product {
  id: string;
  code: string; // 5 numbers
  location: string; // "Heladera 1", "Freezer 2", etc.
  expiryDate: string; // YYYY-MM-DD
  addedDate: string; // ISO string
  addedBy: string; // User who added it
  observations?: string;
  status: 'vigente' | 'vence_hoy' | 'vence_manana' | 'vence_2_dias' | 'vence_3_dias' | 'vencido' | 'descartado' | 'proximo';
  isDiscarded: boolean;
  lastUpdated?: string;
  category?: 'cárnicos' | 'embutidos' | 'lácteos' | 'vegetales' | 'general';
  quantity: number;
}

export interface AuditLog {
  id: string;
  productId: string;
  productCode: string;
  action: 'create' | 'update' | 'delete' | 'discard';
  user: string;
  timestamp: string;
  details?: string;
}

export interface User {
  username: string;
  role: 'admin' | 'empleado';
  passwordHash: string; // plain password for local simplicity
  isDeleted?: boolean;
  lastUpdated?: string;
}

export interface AppConfig {
  key: 'settings';
  alertDays: number;
  alertDaysCarnicos?: number;
  alertDaysEmbutidos?: number;
  alertDaysLacteos?: number;
  alertDaysVegetales?: number;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  syncEnabled: boolean;
  syncProvider?: 'firebase' | 'supabase';
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  supabaseConfig?: {
    url: string;
    anonKey: string;
  };
}

interface ExpiryDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-date': string; 'by-location': string; 'by-status': string };
  };
  audit_logs: {
    key: string;
    value: AuditLog;
    indexes: { 'by-timestamp': string };
  };
  users: {
    key: string;
    value: User;
  };
  config: {
    key: 'settings';
    value: AppConfig;
  };
}

const DB_NAME = 'pedidosya-expiry-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB<ExpiryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store
      const productStore = db.createObjectStore('products', { keyPath: 'id' });
      productStore.createIndex('by-date', 'expiryDate');
      productStore.createIndex('by-location', 'location');
      productStore.createIndex('by-status', 'status');

      // Audit logs store
      const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
      auditStore.createIndex('by-timestamp', 'timestamp');

      // Users store
      db.createObjectStore('users', { keyPath: 'username' });

      // Config store
      db.createObjectStore('config', { keyPath: 'key' });
    },
  });
};

// Seed initial data if database is empty
export const seedDB = async () => {
  const db = await initDB();

  // Seed default users
  const txUser = db.transaction('users', 'readwrite');
  const userStore = txUser.store;
  
  const defaultAdmin = await userStore.get('gfacu7@gmail.com');
  if (!defaultAdmin) {
    await userStore.put({
      username: 'gfacu7@gmail.com',
      role: 'admin',
      passwordHash: 'facu2002',
      isDeleted: false,
      lastUpdated: new Date().toISOString()
    });
  }

  const defaultEmpleado = await userStore.get('empleado');
  if (!defaultEmpleado) {
    await userStore.put({
      username: 'empleado',
      role: 'empleado',
      passwordHash: 'empleado123',
      isDeleted: false,
      lastUpdated: new Date().toISOString()
    });
  }
  await txUser.done;

  // Seed default settings
  const txConfig = db.transaction('config', 'readwrite');
  const configStore = txConfig.store;
  const existingConfig = await configStore.get('settings');
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hasEnvConfig = envUrl && envUrl !== 'YOUR_SUPABASE_URL' && envAnonKey && envAnonKey !== 'YOUR_SUPABASE_ANON_KEY';
  
  if (!existingConfig) {
    await configStore.put({
      key: 'settings',
      alertDays: 3,
      alertDaysCarnicos: 2,
      alertDaysEmbutidos: 5,
      alertDaysLacteos: 3,
      alertDaysVegetales: 1,
      soundEnabled: true,
      theme: 'light',
      syncEnabled: hasEnvConfig,
      syncProvider: hasEnvConfig ? 'supabase' : 'firebase',
      supabaseConfig: hasEnvConfig ? {
        url: envUrl,
        anonKey: envAnonKey
      } : undefined,
    });
  } else if (hasEnvConfig && (!existingConfig.supabaseConfig?.url || existingConfig.supabaseConfig.url === 'YOUR_SUPABASE_URL')) {
    // Update existing config with environment variables if Supabase wasn't configured yet
    existingConfig.syncEnabled = true;
    existingConfig.syncProvider = 'supabase';
    existingConfig.supabaseConfig = {
      url: envUrl,
      anonKey: envAnonKey
    };
    await configStore.put(existingConfig);
  }
  await txConfig.done;
};

// Product Database CRUD operations
export const dbService = {
  // Products
  async getAllProducts(): Promise<Product[]> {
    const db = await initDB();
    return db.getAll('products');
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const db = await initDB();
    return db.get('products', id);
  },

  async saveProduct(product: Product, user: string): Promise<void> {
    const db = await initDB();
    const existing = await db.get('products', product.id);
    const action = existing ? 'update' : 'create';
    
    const tx = db.transaction(['products', 'audit_logs'], 'readwrite');
    await tx.objectStore('products').put(product);
    
    // Add audit log
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      productId: product.id,
      productCode: product.code,
      action,
      user,
      timestamp: new Date().toISOString(),
      details: existing 
        ? `Modificado de ${existing.location} (${existing.expiryDate}) a ${product.location} (${product.expiryDate})`
        : `Creado en ${product.location} con fecha ${product.expiryDate}`,
    };
    await tx.objectStore('audit_logs').put(auditLog);
    await tx.done;
  },

  async discardProduct(id: string, user: string): Promise<void> {
    const db = await initDB();
    const product = await db.get('products', id);
    if (!product) return;

    product.isDiscarded = true;
    product.status = 'descartado';
    product.lastUpdated = new Date().toISOString();

    const tx = db.transaction(['products', 'audit_logs'], 'readwrite');
    await tx.objectStore('products').put(product);

    // Audit log
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      productId: product.id,
      productCode: product.code,
      action: 'discard',
      user,
      timestamp: new Date().toISOString(),
      details: `Marcado como descartado de su ubicación ${product.location}`,
    };
    await tx.objectStore('audit_logs').put(auditLog);
    await tx.done;
  },

  async deleteProduct(id: string, user: string): Promise<void> {
    const db = await initDB();
    const product = await db.get('products', id);
    if (!product) return;

    const tx = db.transaction(['products', 'audit_logs'], 'readwrite');
    await tx.objectStore('products').delete(id);

    // Audit log
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      productId: id,
      productCode: product.code,
      action: 'delete',
      user,
      timestamp: new Date().toISOString(),
      details: `Eliminado permanentemente. Ubicación original: ${product.location}, Vencimiento: ${product.expiryDate}`,
    };
    await tx.objectStore('audit_logs').put(auditLog);
    await tx.done;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const db = await initDB();
    const logs = await db.getAll('audit_logs');
    // Sort logs descending by timestamp
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  // Config Settings
  async getConfig(): Promise<AppConfig> {
    const db = await initDB();
    const config = await db.get('config', 'settings');
    if (!config) {
      return {
        key: 'settings',
        alertDays: 3,
        soundEnabled: true,
        theme: 'light',
        syncEnabled: false,
      };
    }
    return config;
  },

  async saveConfig(config: AppConfig): Promise<void> {
    const db = await initDB();
    await db.put('config', config);
  },

  // Users
  async getUsers(): Promise<User[]> {
    const db = await initDB();
    return db.getAll('users');
  },

  async getUser(username: string): Promise<User | undefined> {
    const db = await initDB();
    return db.get('users', username);
  },

  async saveUser(user: User): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.store.put(user);
    await tx.done;
  },

  async deleteUser(username: string): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.store.delete(username);
    await tx.done;
  },
  
  // Reset database with custom backup data (Restore)
  async restoreData(products: Product[], config: AppConfig, logs: AuditLog[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction(['products', 'config', 'audit_logs'], 'readwrite');
    
    // Clear old data
    await tx.objectStore('products').clear();
    await tx.objectStore('audit_logs').clear();
    
    // Load new data
    for (const prod of products) {
      await tx.objectStore('products').put(prod);
    }
    for (const log of logs) {
      await tx.objectStore('audit_logs').put(log);
    }
    await tx.objectStore('config').put(config);
    
    await tx.done;
  }
};
