'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { FullscreenProvider, useFullscreen } from '@/lib/fullscreen-context';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <FullscreenProvider>
      <ShellLayout>{children}</ShellLayout>
    </FullscreenProvider>
  );
}

function ShellLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || '/';
  const isLoginPath = pathname === '/login' || pathname === '/';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { fullscreen, setFullscreen } = useFullscreen();

  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => { setFullscreen(false); }, [pathname, setFullscreen]);

  useEffect(() => {
    if (drawerOpen) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [drawerOpen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen, setFullscreen]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-slate-500 text-sm">טוען…</div>
      </div>
    );
  }

  if (isLoginPath || !user) return <>{children}</>;

  if (fullscreen) {
    return (
      <div className="min-h-screen bg-slate-100">
        <main className="p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="hidden lg:block fixed top-0 right-0 h-screen w-[260px] z-30">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/55 z-40 lg:hidden animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="fixed top-0 right-0 h-screen w-[280px] max-w-[85vw] z-50 lg:hidden animate-slide-in-rtl shadow-2xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex flex-col min-w-0 min-h-screen lg:mr-[260px]">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="p-3 sm:p-4 md:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
