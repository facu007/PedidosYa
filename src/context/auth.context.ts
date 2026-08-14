import { createContext } from 'react';
import type { User } from '../services/db';

export interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (username: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (newUser: User) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (username: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
