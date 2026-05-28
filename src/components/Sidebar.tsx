'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  IconBoxes, IconBuilding, IconChart, IconAlert, IconScale,
  IconUsers, IconHistory, IconX,
} from './Icon';
import type { ReactNode } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { path: '/dashboard',  label: 'דשבורד ניהולי', icon: <IconChart /> },
  { path: '/facilities', label: 'מתקנים',         icon: <IconBuilding /> },
  { path: '/inventory',  label: 'עדכון מלאי',     icon: <IconBoxes /> },
  { path: '/gaps',       label: 'פערים וחוסרים', icon: <IconAlert /> },
  { path: '/standards',  label: 'תקנים (חוקה)',  icon: <IconScale /> },
  { path: '/users',      label: 'משתמשים והרשאות', icon: <IconUsers />, adminOnly: true },
  { path: '/audit',      label: 'יומן שינויים',  icon: <IconHistory /> },
];

interface Props {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = NAV.filter((n) => !n.adminOnly || user?.role === 'admin');

  return (
    <div
      className="h-full w-full flex flex-col overflow-y-auto p-4 sm:p-5 text-slate-100"
      style={{ background: 'linear-gradient(180deg, #0f2a44 0%, #173a5e 100%)' }}
    >
      <div className="flex items-center gap-3 pb-4 mb-3 border-b border-white/10">
        <div
          className="w-11 h-11 rounded-xl grid place-items-center font-extrabold text-primary text-base shadow-[0_6px_14px_rgba(212,175,55,0.25)]"
          style={{ background: 'linear-gradient(135deg, #d4af37, #e6c768)' }}
        >
          אמ
        </div>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium border transition ${
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
      </nav>

      <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-400">
        <div>גרסה 2.0.0 · Next.js</div>
        <div className="opacity-70 mt-1">© הרבנות הצבאית</div>
      </div>
    </div>
  );
}
