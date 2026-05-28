'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/catalog';
import { IconLogout, IconMenu, IconSearch } from './Icon';

const TITLES: Array<[RegExp, string, string]> = [
  [/^\/dashboard/,                'דשבורד ניהולי',     'תצוגה כוללת של מצב המרחב הרבנותי'],
  [/^\/facilities\/new/,          'הוספת מתקן חדש',    'מילוי פרטי מתקן צבאי'],
  [/^\/facilities\/[^/]+\/edit/,  'עריכת מתקן',        'עדכון פרטי מתקן צבאי'],
  [/^\/facilities\/[^/]+$/,       'פרטי מתקן',         'תצוגת מתקן ומלאי'],
  [/^\/facilities$/,              'מתקנים',            'רשימת מתקנים רבנותיים'],
  [/^\/inventory/,                'עדכון מלאי',        'הזנת כמויות והשוואה לתקן'],
  [/^\/gaps/,                     'פערים וחוסרים',     'תצוגת פערים מול תקני רבצ״ר'],
  [/^\/standards/,                'תקנים (חוקה)',      'ניהול תקנים לפי הוראות רבצ״ר'],
  [/^\/users/,                    'משתמשים והרשאות',   'ניהול משתמשי המערכת'],
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
  const { user, signOut } = useAuth();
  const { title, sub } = titleFor(pathname);
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('');

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-3 sm:px-4 md:px-6 gap-2 sm:gap-3 md:gap-4 sticky top-0 z-20">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          aria-label="פתח תפריט"
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700 shrink-0"
        >
          <IconMenu size={22} />
        </button>
      )}

      <div className="min-w-0 flex-1 lg:flex-none">
        <div className="text-[15px] sm:text-[17px] font-bold text-slate-900 truncate">{title}</div>
        <div className="text-xs text-slate-500 hidden sm:block truncate">{sub}</div>
      </div>

      <div className="hidden lg:block flex-1" />

      <div className="relative w-[320px] max-w-[35vw] hidden md:block">
        <input
          type="search"
          placeholder="חיפוש מתקנים, יחידות, פריטים..."
          className="w-full pr-10 pl-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15 outline-none transition"
        />
        <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </div>

      <button
        onClick={signOut}
        className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition shrink-0"
        title="התנתק"
      >
        <div className="w-8 h-8 rounded-full grid place-items-center text-white font-bold text-xs shrink-0"
             style={{ background: 'linear-gradient(135deg, #0f2a44, #1f4d7a)' }}>
          {initials}
        </div>
        <div className="hidden sm:flex flex-col leading-tight text-right min-w-0">
          <strong className="text-[13px] truncate max-w-[140px]">{user?.name || 'אורח'}</strong>
          <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{ROLE_LABELS[user?.role || ''] || ''}</span>
        </div>
        <IconLogout size={16} className="text-slate-500 hidden sm:block" />
      </button>
    </header>
  );
}
