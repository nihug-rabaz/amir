'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PWA_INSTALL_LABEL, usePwaInstall } from '@/lib/pwa-install';
import {
  IconBoxes, IconBuilding, IconChart, IconAlert, IconScale,
  IconHistory, IconX, IconShield, IconDownload, IconHeadset,
} from './Icon';
import { BrandMark } from './BrandMark';
import { DeveloperCredit } from './DeveloperCredit';
import type { ReactNode } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { path: '/dashboard',  label: 'דשבורד ניהולי',   icon: <IconChart /> },
  { path: '/admin',      label: 'סקירת מנהל',      icon: <IconShield />, adminOnly: true },
  { path: '/facilities', label: 'מתקנים',           icon: <IconBuilding /> },
  { path: '/inventory',  label: 'עדכון מלאי',       icon: <IconBoxes /> },
  { path: '/gaps',       label: 'פערים וחוסרים',   icon: <IconAlert /> },
  { path: '/standards',  label: 'תקנים (חוקה)',    icon: <IconScale /> },
  { path: '/audit',      label: 'יומן שינויים',    icon: <IconHistory />, adminOnly: true },
];

interface Props {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { canInstall, openPopup } = usePwaInstall();
  const items = NAV.filter((n) => !n.adminOnly || user?.role === 'admin');

  const onInstallClick = () => {
    openPopup();
    onNavigate?.();
  };

  return (
    <div
      className="h-full w-full flex flex-col overflow-y-auto p-4 sm:p-5 text-slate-100"
      style={{ background: 'linear-gradient(180deg, #0f2a44 0%, #173a5e 100%)' }}
    >
      <div className="flex items-center gap-3 pb-4 mb-3 border-b border-white/10">
        <BrandMark size={44} priority />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-extrabold tracking-wide truncate">אמי״ר 2.0</div>
          <div className="text-[11px] font-medium text-slate-300 truncate">ארגון מרחב ייעודי רבנותי</div>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            aria-label="סגור תפריט"
            className="lg:hidden p-1.5 rounded-md text-slate-300 hover:bg-white/10"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      <div className="text-[11px] uppercase tracking-widest text-slate-400 px-2 pt-1 pb-2 font-semibold">
        תפריט ראשי
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((it) => {
          const active = pathname === it.path || pathname?.startsWith(it.path + '/');
          return (
            <Link
              key={it.path}
              href={it.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium border transition duration-200 ${
                active
                  ? 'text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'
              }`}
              style={active ? { background: 'rgba(212,175,55,0.12)', borderColor: 'rgba(212,175,55,0.35)' } : undefined}
            >
              <span className={active ? 'text-accent' : ''}>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}

        {canInstall && (
          <button
            type="button"
            onClick={onInstallClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium border border-transparent text-slate-300 hover:bg-white/5 hover:text-white transition duration-200 text-right"
          >
            <span><IconDownload /></span>
            <span>{PWA_INSTALL_LABEL}</span>
          </button>
        )}
        <a
          href="https://chat.whatsapp.com/FhbpnprljpqC0Ke9rXyjCP?s=cl&p=a&ilr=4"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium border border-transparent text-slate-300 hover:bg-white/5 hover:text-white transition duration-200"
        >
          <span><IconHeadset /></span>
          <span>תמיכה טכנית</span>
        </a>
      </nav>

      <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-400 space-y-3">
        <DeveloperCredit tone="dark" />
        <div className="opacity-70">גרסה 2.0.0</div>
      </div>
    </div>
  );
}
