import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral';

export function Kpi({ label, value, icon, tone = 'info', delta }: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  delta?: string;
}) {
  return (
    <div className="kpi">
      <div className={`kpi-icon ${tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : tone === 'accent' ? 'accent' : tone === 'neutral' ? 'neutral' : ''}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span className="font-num text-2xl font-bold text-slate-900">{value}</span>
        {delta && <span className="text-[11px] text-slate-500 mt-0.5">{delta}</span>}
      </div>
    </div>
  );
}
