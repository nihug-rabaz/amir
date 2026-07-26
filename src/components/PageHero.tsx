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
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-soft animate-fade-up">
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
      <div className="relative flex items-end justify-between flex-wrap gap-3 px-5 sm:px-6 py-5 sm:py-6 text-white">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold m-0 tracking-tight">{title}</h1>
          {subtitle && <div className="text-sm text-white/75 mt-1.5">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </section>
  );
}
