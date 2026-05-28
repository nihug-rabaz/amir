'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Kind = 'info' | 'success' | 'warning' | 'danger';
interface ToastItem { id: number; title: string; message?: string; kind: Kind; }

interface ToastApi {
  show: (t: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  danger: (title: string, message?: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

const kindStyles: Record<Kind, string> = {
  info: 'border-info',
  success: 'border-ok',
  warning: 'border-warn',
  danger: 'border-bad',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((arr) => [...arr, { ...t, id }]);
    setTimeout(() => setItems((arr) => arr.filter((x) => x.id !== id)), 3500);
  }, []);

  const api: ToastApi = {
    show,
    success: (title, message) => show({ title, message, kind: 'success' }),
    warning: (title, message) => show({ title, message, kind: 'warning' }),
    danger:  (title, message) => show({ title, message, kind: 'danger' }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:bottom-6 sm:left-6 z-[1000] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <div key={t.id}
               className={`pointer-events-auto animate-toast-in w-full sm:min-w-[280px] sm:max-w-md bg-white border border-slate-200 ${kindStyles[t.kind]} border-l-4 rounded-xl shadow-card px-4 py-3`}>
            <div className="font-bold text-slate-900">{t.title}</div>
            {t.message && <div className="text-xs text-slate-500 mt-0.5">{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
