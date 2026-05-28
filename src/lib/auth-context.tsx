'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);
const STORAGE_KEY = 'amir2:session-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const isLogin = pathname === '/login' || pathname === '/';
    if (!user && !isLogin) router.replace('/login');
    if (user && isLogin) router.replace('/dashboard');
  }, [user, loading, pathname, router]);

  const signIn = useCallback((u: User) => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
    setUser(u);
    router.replace('/dashboard');
  }, [router]);

  const signOut = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo<AuthState>(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
