'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useToast } from '@/lib/toast';
import { subscribeOnlineStatus } from './api';
import { OfflineQueueStore } from './store';
import { OfflineSync } from './sync';

interface OfflineState {
  online: boolean;
  pending: number;
  syncing: boolean;
  refreshPending: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const OfflineCtx = createContext<OfflineState | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    setPending(await OfflineQueueStore.count());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    const count = await OfflineQueueStore.count();
    if (!count) return;
    setSyncing(true);
    try {
      const result = await OfflineSync.flush();
      await refreshPending();
      if (result.synced > 0) {
        toast.success('סנכרון הושלם', `${result.synced} שינויים נשלחו לשרת`);
      }
      if (result.failed.length > 0) {
        toast.warning('חלק מהשינויים נכשלו', `${result.failed.length} פריטים ממתינים לניסיון נוסף`);
      }
    } catch {
      toast.danger('שגיאת סנכרון', 'לא ניתן לשלוח את השינויים המקומיים');
    } finally {
      setSyncing(false);
    }
  }, [refreshPending, syncing, toast]);

  const syncRef = useRef(syncNow);
  syncRef.current = syncNow;

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();
    if (navigator.onLine) syncRef.current();
    return subscribeOnlineStatus((next) => {
      setOnline(next);
      refreshPending();
      if (next) syncRef.current();
    });
  }, [refreshPending]);

  const value = useMemo(
    () => ({ online, pending, syncing, refreshPending, syncNow }),
    [online, pending, syncing, refreshPending, syncNow],
  );

  return <OfflineCtx.Provider value={value}>{children}</OfflineCtx.Provider>;
}

export function useOffline(): OfflineState {
  const ctx = useContext(OfflineCtx);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
