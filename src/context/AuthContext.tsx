import React, { useCallback, useEffect, useState } from 'react';
import { dbService } from '../services/db';
import type { User } from '../services/db';
import { syncService } from '../services/syncService';
import { AuthContext } from './auth.context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    try {
      const allUsers = await dbService.getUsers();
      // Filter out deleted users for the local UI list
      setUsers(allUsers.filter(u => !u.isDeleted));
    } catch (e) {
      console.error('Error refreshing users list:', e);
    }
  }, []);

  const triggerBackgroundSync = useCallback(async () => {
    try {
      const dbConfig = await dbService.getConfig();
      if (dbConfig.syncEnabled && navigator.onLine) {
        await syncService.syncData(dbConfig);
      }
    } catch (e) {
      console.error('Error syncing users in background:', e);
    }
  }, []);

  // Load session from localStorage on init
  useEffect(() => {
    const initSession = async () => {
      try {
        const storedUser = localStorage.getItem('pedidosya_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser) as { username: string };
          const dbUser = await dbService.getUser(parsed.username);
          if (dbUser) {
            setUser(dbUser);
          } else {
            localStorage.removeItem('pedidosya_user');
          }
        }
        await refreshUsers();
      } catch (e) {
        console.error('Error recovering session:', e);
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [refreshUsers]);

  const login = async (username: string, passwordHash: string): Promise<{ success: boolean; error?: string }> => {
    try {
      let dbUser = await dbService.getUser(username);
      if (!dbUser && navigator.onLine) {
        const dbConfig = await dbService.getConfig();
        await syncService.syncData(dbConfig);
        dbUser = await dbService.getUser(username);
      }

      if (!dbUser || dbUser.isDeleted) {
        return { success: false, error: 'Usuario no encontrado.' };
      }
      
      if (dbUser.passwordHash !== passwordHash) {
        return { success: false, error: 'Contraseña incorrecta.' };
      }

      setUser(dbUser);
      localStorage.setItem('pedidosya_user', JSON.stringify({ username: dbUser.username, role: dbUser.role }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: `Error de base de datos: ${e.message || e}` };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pedidosya_user');
  };

  const createUser = async (newUser: User): Promise<{ success: boolean; error?: string }> => {
    try {
      const existing = await dbService.getUser(newUser.username);
      if (existing && !existing.isDeleted) {
        return { success: false, error: 'El usuario ya existe.' };
      }

      const userWithMeta = {
        ...newUser,
        isDeleted: false,
        lastUpdated: new Date().toISOString()
      };
      await dbService.saveUser(userWithMeta);
      await refreshUsers();
      triggerBackgroundSync();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: `Error de base de datos: ${e.message || e}` };
    }
  };

  const deleteUser = async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (user?.username === username) {
        return { success: false, error: 'No puedes eliminar tu propio usuario activo.' };
      }

      const dbUser = await dbService.getUser(username);
      if (dbUser) {
        dbUser.isDeleted = true;
        dbUser.lastUpdated = new Date().toISOString();
        await dbService.saveUser(dbUser);
      }
      await refreshUsers();
      triggerBackgroundSync();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: `Error al eliminar: ${e.message || e}` };
    }
  };

  return (
    <AuthContext.Provider value={{ user, users, loading, login, logout, createUser, deleteUser, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
};
