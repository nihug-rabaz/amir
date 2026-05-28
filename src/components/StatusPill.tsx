import { statusColor } from '@/lib/catalog';
import type { GapStatus } from '@/lib/types';

export function StatusPill({ status }: { status: string | null | undefined }) {
  const c = statusColor(status);
  return (
    <span className="status-pill" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status || '—'}
    </span>
  );
}

export function ComplianceCell({ pct }: { pct: number }) {
  const color = pct >= 90 ? '#16a34a' : pct >= 70 ? '#ea7c1d' : '#c53030';
  return (
    <div className="flex items-center gap-2 font-num font-bold">
      <div className="compliance-bar">
        <span style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <span className="text-xs min-w-[32px]">{pct}%</span>
    </div>
  );
}

export function GapStatusBadge({ status }: { status: GapStatus }) {
  const map: Record<GapStatus, { cls: string; label: string }> = {
    ok: { cls: 'badge-ok', label: 'תקין' },
    missing: { cls: 'badge-bad', label: 'חסר' },
    surplus: { cls: 'badge-info', label: 'עודף' },
    'not-relevant': { cls: 'badge', label: 'לא רלוונטי' },
  };
  const m = map[status];
  return <span className={`badge ${m.cls}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{m.label}</span>;
}
