import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  bannerSrc?: string;
}

// Page header with optional atmospheric banner for stronger visual hierarchy.
export function PageHero({
  title,
  subtitle,
  actions,
  bannerSrc = '/ui/dashboard-banner.jpg',
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-soft animate-fade-up">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bannerSrc})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(15,42,68,0.92) 0%, rgba(15,42,68,0.78) 48%, rgba(15,42,68,0.45) 100%)',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6 text-white">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold m-0 tracking-tight leading-snug">{title}</h1>
          {subtitle && <div className="text-xs sm:text-sm text-white/75 mt-1 leading-snug">{subtitle}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
