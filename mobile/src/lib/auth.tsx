/* ============================================================================
 * MOCK AUTH — DELETE FOR REAL DEPLOYMENT
 * ----------------------------------------------------------------------------
 * A purely client-side gate so the app has a login screen, mirroring the web
 * app (web/src/auth.tsx). Credentials are hardcoded (any of the mock users /
 * password "admin") and checked on-device — this is NOT real security. For a
 * real personal deployment the app is already private (your phone, your data),
 * so you can delete this gate or replace it with a real backend check.
 * ==========================================================================*/

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOCK_USERS = ['austin', 'brian', 'allison', 'steven', 'jordan'];
const MOCK_PASSWORD = 'admin';
const STORAGE_KEY = 'pf-mock-auth';

interface AuthContextValue {
  ready: boolean;
  isAuthed: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setIsAuthed(v === 'true'))
      .finally(() => setReady(true));
  }, []);

  const login = (username: string, password: string): boolean => {
    const ok =
      MOCK_USERS.includes(username.trim().toLowerCase()) && password === MOCK_PASSWORD;
    if (ok) {
      AsyncStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthed(true);
    }
    return ok;
  };

  const logout = () => {
    AsyncStorage.removeItem(STORAGE_KEY);
    setIsAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ ready, isAuthed, login, logout }}>
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
