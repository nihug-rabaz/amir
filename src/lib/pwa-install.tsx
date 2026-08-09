'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const DISMISS_KEY = 'amir-pwa-install-dismissed';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
export const PWA_INSTALL_LABEL = 'להורדת האפלקציה';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'manual';

export class PwaInstallController {
  private deferred: BeforeInstallPromptEvent | null = null;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  get canPromptNative(): boolean {
    return this.deferred !== null;
  }

  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const media = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    return media || iosStandalone;
  }

  isIos(): boolean {
    if (typeof window === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  wasDismissedRecently(): boolean {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < DISMISS_MS;
  }

  dismissForNow(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    this.notify();
  }

  clearDismiss(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(DISMISS_KEY);
    this.notify();
  }

  capturePrompt(event: Event): void {
    event.preventDefault();
    this.deferred = event as BeforeInstallPromptEvent;
    this.notify();
  }

  markInstalled(): void {
    this.deferred = null;
    this.notify();
  }

  async promptInstall(): Promise<InstallOutcome> {
    if (!this.deferred) {
      return this.isIos() || !this.isStandalone() ? 'manual' : 'unavailable';
    }

    const promptEvent = this.deferred;
    this.deferred = null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    this.notify();
    return choice.outcome;
  }
}

interface PwaInstallContextValue {
  controller: PwaInstallController;
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  popupOpen: boolean;
  openPopup: () => void;
  closePopup: (dismiss?: boolean) => void;
  install: () => Promise<InstallOutcome>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const controller = useMemo(() => new PwaInstallController(), []);
  const [, setTick] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => controller.subscribe(refresh), [controller, refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstall = (event: Event) => controller.capturePrompt(event);
    const onInstalled = () => {
      controller.markInstalled();
      setPopupOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    setReady(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [controller]);

  useEffect(() => {
    if (!ready) return;
    if (controller.isStandalone()) return;
    if (controller.wasDismissedRecently()) return;
    const timer = window.setTimeout(() => setPopupOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [ready, controller]);

  const isInstalled = ready && controller.isStandalone();
  const isIos = ready && controller.isIos();
  const canInstall = ready && !isInstalled;

  const openPopup = useCallback(() => {
    controller.clearDismiss();
    setPopupOpen(true);
  }, [controller]);

  const closePopup = useCallback((dismiss = true) => {
    if (dismiss) controller.dismissForNow();
    setPopupOpen(false);
  }, [controller]);

  const install = useCallback(async () => controller.promptInstall(), [controller]);

  const value = useMemo<PwaInstallContextValue>(() => ({
    controller,
    canInstall,
    isInstalled,
    isIos,
    popupOpen: popupOpen && canInstall,
    openPopup,
    closePopup,
    install,
  }), [controller, canInstall, isInstalled, isIos, popupOpen, openPopup, closePopup, install]);

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) throw new Error('usePwaInstall must be used within PwaInstallProvider');
  return ctx;
}
