'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/catalog';
import { IconLogout, IconMenu, IconShield } from './Icon';
import { GlobalSearch } from './GlobalSearch';
import { BrandMark } from './BrandMark';

const TITLES: Array<[RegExp, string, string]> = [
  [/^\/admin/,                    'סקירת מנהל',         'תצוגת על של כל המתקנים והמשתמשים'],
  [/^\/dashboard/,                'דשבורד ניהולי',     'תצוגה כוללת של מצב המרחב הרבנותי'],
  [/^\/facilities\/new/,          'הוספת מתקן חדש',    'מילוי פרטי מתקן צבאי'],
  [/^\/facilities\/[^/]+\/edit/,  'עריכת מתקן',        'עדכון פרטי מתקן צבאי'],
  [/^\/facilities\/[^/]+$/,       'פרטי מתקן',         'תצוגת מתקן ומלאי'],
  [/^\/facilities$/,              'מתקנים',            'רשימת מתקנים רבנותיים'],
  [/^\/inventory/,                'עדכון מלאי',        'הזנת כמויות והשוואה לתקן'],
  [/^\/gaps/,                     'פערים וחוסרים',     'תצוגת פערים מול תקני רבצ״ר'],
  [/^\/standards/,                'תקנים (חוקה)',      'ניהול תקנים לפי הוראות רבצ״ר'],
  [/^\/audit/,                    'יומן שינויים',      'תיעוד פעולות משתמשים'],
];

function titleFor(path: string): { title: string; sub: string } {
  for (const [re, t, s] of TITLES) if (re.test(path)) return { title: t, sub: s };
  return { title: 'אמי״ר 2.0', sub: '' };
}

interface Props {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: Props) {
  const pathname = usePathname() || '/';
  const { user, signOut, impersonator, stopImpersonating } = useAuth();
  const { title, sub } = titleFor(pathname);
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('');

  return (
    <header
      className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/90"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-14 sm:h-16 px-2.5 sm:px-4 md:px-6 flex items-center gap-1.5 sm:gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="פתח תפריט"
            className="lg:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-700 shrink-0"
          >
            <IconMenu size={22} />
          </button>
        )}

        <div className="min-w-0 flex-1 flex items-center gap-2">
          <BrandMark size={32} className="hidden sm:inline-grid lg:hidden shrink-0" />
          <div className="min-w-0">
            <div className="text-[14px] sm:text-[16px] md:text-[17px] font-extrabold text-slate-900 truncate leading-tight">
              {title}
            </div>
            <div className="text-[11px] text-slate-500 hidden md:block truncate leading-tight mt-0.5">{sub}</div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <GlobalSearch />

          {impersonator && (
            <button
              onClick={stopImpersonating}
              className="h-10 px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition inline-flex items-center gap-1"
              title={`חזרה אל ${impersonator.name}`}
            >
              <IconShield size={14} />
              <span className="hidden sm:inline">חזרה</span>
            </button>
          )}

          <button
            onClick={signOut}
            className="h-10 pl-1 pr-1.5 sm:pl-1.5 sm:pr-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition inline-flex items-center gap-1.5 sm:gap-2"
            title="התנתק"
          >
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-white font-bold text-[11px] shrink-0"
              style={{ background: 'linear-gradient(135deg, #0f2a44, #1f4d7a)' }}
            >
              {initials}
            </div>
            <div className="hidden md:flex flex-col leading-tight text-right min-w-0">
              <strong className="text-[13px] truncate max-w-[140px]">{user?.name || 'אורח'}</strong>
              <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                {impersonator ? `התחזות · ${ROLE_LABELS[user?.role || ''] || ''}` : (ROLE_LABELS[user?.role || ''] || '')}
              </span>
            </div>
            <IconLogout size={15} className="text-slate-500 hidden sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
