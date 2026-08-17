'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthSession } from '../types';

const TOKEN_KEY = 'charis.access_token';
const REFRESH_KEY = 'charis.refresh_token';
const USER_KEY = 'charis.user';

type AuthContextType = {
  session: AuthSession | null;
  setSession: (s: AuthSession | null) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const access = localStorage.getItem(TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (access && refresh && userRaw) {
      try {
        setSessionState({ accessToken: access, refreshToken: refresh, user: JSON.parse(userRaw) });
      } catch {}
    }
    setIsLoading(false);
  }, []);

  function setSession(s: AuthSession | null) {
    if (s) {
      localStorage.setItem(TOKEN_KEY, s.accessToken);
      localStorage.setItem(REFRESH_KEY, s.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(s.user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setSessionState(s);
  }

  function logout() {
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, setSession, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
