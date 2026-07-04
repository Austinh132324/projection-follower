/* ============================================================================
 * MOCK AUTH — DELETE FOR REAL DEPLOYMENT
 * ----------------------------------------------------------------------------
 * A purely client-side gate so the static demo has a login screen. Credentials
 * are hardcoded (austin / admin) and checked in the browser — this is NOT real
 * security and stores nothing sensitive. For a real personal deployment the
 * whole app is already private (it runs on your machine against your DB), so you
 * can delete this gate, or replace it with a real check against the backend.
 * ==========================================================================*/

import { createContext, useContext, useState, type ReactNode } from 'react';

const MOCK_USERNAME = 'austin';
const MOCK_PASSWORD = 'admin';
const STORAGE_KEY = 'pf-mock-auth';

interface AuthContextValue {
  isAuthed: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === 'true',
  );

  const login = (username: string, password: string): boolean => {
    const ok =
      username.trim().toLowerCase() === MOCK_USERNAME && password === MOCK_PASSWORD;
    if (ok) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthed(true);
    }
    return ok;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthed, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
/* ======================= END MOCK AUTH =================================== */
