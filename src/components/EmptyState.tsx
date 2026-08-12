import Image from 'next/image';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  imageSrc?: string;
  action?: ReactNode;
  compact?: boolean;
}

// Empty / loading placeholder; image is optional so loading states stay text-only.
export function EmptyState({
  title,
  subtitle,
  imageSrc,
  action,
  compact = false,
}: Props) {
  return (
    <div className={`grid place-items-center text-center ${compact ? 'py-8 px-4' : 'py-12 px-6'} animate-fade-up`}>
      {imageSrc && (
        <div className={`relative ${compact ? 'w-28 h-28' : 'w-40 h-40'} mb-4 opacity-95`}>
          <Image src={imageSrc} alt="" fill className="object-contain" sizes={compact ? '112px' : '160px'} />
        </div>
      )}
      <h3 className="m-0 text-base font-extrabold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-1.5 mb-0 text-sm text-slate-500 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
