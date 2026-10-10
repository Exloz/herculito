import { createContext } from 'react';
import type { User } from '../../../shared/types';

export interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isAdminResolved: boolean;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);
