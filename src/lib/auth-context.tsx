'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from './types';
import { repairUtf8Mojibake } from './utf8';

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

function sanitizeUser(u: User | null): User | null {
  if (!u) return null;
  return { ...u, name: repairUtf8Mojibake(u.name || '') };
}

function readStorage(key: string): User | null {
  try {
    const raw = sessionStorage.getItem(key);
    return sanitizeUser(raw ? (JSON.parse(raw) as User) : null);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: User | null) {
  try {
    const next = sanitizeUser(value);
    if (next) sessionStorage.setItem(key, JSON.stringify(next));
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
    const storedUser = readStorage(STORAGE_KEY);
    const storedImpersonator = readStorage(IMPERSONATOR_KEY);
    setUser(storedUser);
    setImpersonator(storedImpersonator);
    setLoading(false);

    if (!storedUser) return;
    // Refresh name/role from API so stale session mojibake is replaced.
    let active = true;
    fetch('/api/users', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!active || !j?.users) return;
        const list = j.users as User[];
        const fresh = list.find((x) => x.id === storedUser.id);
        if (!fresh) return;
        const next = sanitizeUser(fresh);
        if (!next) return;
        writeStorage(STORAGE_KEY, next);
        setUser(next);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    const isLogin = pathname === '/login' || pathname === '/';
    if (!user && !isLogin) router.replace('/login');
    if (user && isLogin) router.replace('/dashboard');
  }, [user, loading, pathname, router]);

  const signIn = useCallback((u: User) => {
    const next = sanitizeUser(u);
    writeStorage(STORAGE_KEY, next);
    writeStorage(IMPERSONATOR_KEY, null);
    setUser(next);
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
    const nextAdmin = sanitizeUser(admin);
    const nextTarget = sanitizeUser(target);
    writeStorage(IMPERSONATOR_KEY, nextAdmin);
    writeStorage(STORAGE_KEY, nextTarget);
    setImpersonator(nextAdmin);
    setUser(nextTarget);
    router.replace('/dashboard');
  }, [user, impersonator, router]);

  const stopImpersonating = useCallback(() => {
    if (!impersonator) return;
    const next = sanitizeUser(impersonator);
    writeStorage(STORAGE_KEY, next);
    writeStorage(IMPERSONATOR_KEY, null);
    setUser(next);
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
