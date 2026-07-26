'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from './types';

interface AuthState {
  user: User | null;
  impersonator: User | null;
  loading: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  impersonate: (target: User) => void;
  stopImpersonating: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);
const STORAGE_KEY = 'amir2:session-user';
const IMPERSONATOR_KEY = 'amir2:impersonator';

function readStorage(key: string): User | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: User | null) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonator, setImpersonator] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUser(readStorage(STORAGE_KEY));
    setImpersonator(readStorage(IMPERSONATOR_KEY));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const isLogin = pathname === '/login' || pathname === '/';
    if (!user && !isLogin) router.replace('/login');
    if (user && isLogin) router.replace('/dashboard');
  }, [user, loading, pathname, router]);

  const signIn = useCallback((u: User) => {
    writeStorage(STORAGE_KEY, u);
    writeStorage(IMPERSONATOR_KEY, null);
    setUser(u);
    setImpersonator(null);
    router.replace('/dashboard');
  }, [router]);

  const signOut = useCallback(() => {
    writeStorage(STORAGE_KEY, null);
    writeStorage(IMPERSONATOR_KEY, null);
    setUser(null);
    setImpersonator(null);
    router.replace('/login');
  }, [router]);

  // Switch session to another user while keeping the admin for restore.
  const impersonate = useCallback((target: User) => {
    const admin = impersonator || (user?.role === 'admin' ? user : null);
    if (!admin || admin.role !== 'admin') return;
    if (target.id === admin.id) return;
    writeStorage(IMPERSONATOR_KEY, admin);
    writeStorage(STORAGE_KEY, target);
    setImpersonator(admin);
    setUser(target);
    router.replace('/dashboard');
  }, [user, impersonator, router]);

  const stopImpersonating = useCallback(() => {
    if (!impersonator) return;
    writeStorage(STORAGE_KEY, impersonator);
    writeStorage(IMPERSONATOR_KEY, null);
    setUser(impersonator);
    setImpersonator(null);
    router.replace('/admin');
  }, [impersonator, router]);

  const value = useMemo<AuthState>(
    () => ({ user, impersonator, loading, signIn, signOut, impersonate, stopImpersonating }),
    [user, impersonator, loading, signIn, signOut, impersonate, stopImpersonating],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
