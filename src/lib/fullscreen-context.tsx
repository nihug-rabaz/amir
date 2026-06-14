'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface FullscreenState {
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
}

const FullscreenCtx = createContext<FullscreenState>({ fullscreen: false, setFullscreen: () => {} });

// Shares a fullscreen flag so a page can hide the app chrome (topbar + sidebar).
export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [fullscreen, setFullscreen] = useState(false);
  return <FullscreenCtx.Provider value={{ fullscreen, setFullscreen }}>{children}</FullscreenCtx.Provider>;
}

export const useFullscreen = () => useContext(FullscreenCtx);
