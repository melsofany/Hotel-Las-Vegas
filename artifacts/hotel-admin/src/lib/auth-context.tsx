import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Employee } from '@workspace/api-client-react';

const STORAGE_KEY = 'hotel-admin-auth';

interface StoredAuth {
  token: string;
  employee: Employee;
}

interface AuthContextValue {
  employee: Employee | null;
  token: string | null;
  isLoading: boolean;
  login: (auth: StoredAuth) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setAuth(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (next: StoredAuth) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuth(next);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  };

  return (
    <AuthContext.Provider
      value={{
        employee: auth?.employee ?? null,
        token: auth?.token ?? null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
