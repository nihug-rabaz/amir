'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { filterFacilities } from '@/lib/permissions';
import type { FacilityWithCompliance } from '@/lib/types';
import { COMMANDS, ITEM_CATEGORIES, ROLE_LABELS } from '@/lib/catalog';
import { fmtNumber } from '@/lib/format';
import { Kpi } from '@/components/Kpi';
import { ComplianceCell } from '@/components/StatusPill';
import { IconAlert, IconBuilding, IconBoxes, IconCheck, IconChart, IconCog, IconScale, IconScroll, IconStar, IconX } from '@/components/Icon';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Link from 'next/link';

const PIE_COLORS = ['#16a34a', '#ea7c1d', '#94a3b8', '#2563eb', '#7c3aed', '#cbd5e1', '#d4af37', '#0f2a44'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FacilityWithCompliance[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/facilities?with=compliance')
      .then((r) => r.json())
      .then((j) => setData(j.facilities || []))
      .catch((e) => setErr(String(e)));
  }, []);

  const visible = useMemo(() => filterFacilities(user, data || []), [user, data]);

  const summary = useMemo(() => {
    const total = visible.length;
    const active = visible.filter((f) => f.status === 'תקין - בשימוש').length;
    const reno = visible.filter((f) => f.status === 'בשיפוץ').length;
    const inactive = visible.filter((f) => f.status === 'לא בשימוש').length;
    const compliant = visible.filter((f) => f.compliance.compliancePct >= 90).length;
    const totalGaps = visible.reduce((s, f) => s + f.compliance.totalGap, 0);
    const totalSurplus = visible.reduce((s, f) => s + f.compliance.totalSurplus, 0);
    const avgCompliance = total === 0 ? 0 : Math.round(visible.reduce((s, f) => s + f.compliance.compliancePct, 0) / total);
    return { total, active, reno, inactive, compliant, totalGaps, totalSurplus, avgCompliance };
  }, [visible]);

  const statusChart = useMemo(() => {
    const map = visible.reduce<Record<string, number>>((acc, f) => {
      const k = f.status || 'ללא';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visible]);

  const byCommand = useMemo(() => {
    const out: Array<{ command: string; compliance: number; gaps: number }> = [];
    for (const cmd of COMMANDS) {
      const arr = visible.filter((f) => f.command === cmd);
      if (arr.length === 0) continue;
      out.push({
        command: cmd,
        compliance: Math.round(arr.reduce((s, f) => s + f.compliance.compliancePct, 0) / arr.length),
        gaps: arr.reduce((s, f) => s + f.compliance.totalGap, 0),
      });
    }
    return out;
  }, [visible]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of visible) {
      for (const r of f.compliance.rows) {
        if (r.gap > 0) {
          const k = ITEM_CATEGORIES[r.category] || r.category;
          map[k] = (map[k] || 0) + r.gap;
        }
      }
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visible]);

  const topFacilities = useMemo(
    () => [...visible].filter((f) => f.compliance.totalGap > 0)
      .sort((a, b) => b.compliance.totalGap - a.compliance.totalGap).slice(0, 10),
    [visible],
  );

  const topItems = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of visible) {
      for (const r of f.compliance.rows) {
        if (r.gap > 0) map[r.name] = (map[r.name] || 0) + r.gap;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [visible]);

  if (err) {
    return <div className="card card-padded text-bad">שגיאה בטעינה: {err}</div>;
  }
  if (!data) {
    return <div className="card card-padded text-slate-500">טוען נתוני דשבורד…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">שלום {user?.name}</h1>
          <div className="text-sm text-slate-500 mt-1">
            {ROLE_LABELS[user?.role || '']} · {summary.total} מתקנים בתחום אחריותך
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/facilities" className="btn btn-ghost"><IconBuilding /> מתקנים</Link>
          <Link href="/facilities/new" className="btn btn-primary"><IconBuilding /> הוספת מתקן</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="סה״כ מתקנים" value={fmtNumber(summary.total)} icon={<IconBuilding />} tone="info" />
        <Kpi label="תקינים - בשימוש" value={fmtNumber(summary.active)} icon={<IconCheck />} tone="success" />
        <Kpi label="בשיפוץ" value={fmtNumber(summary.reno)} icon={<IconCog />} tone="warning" />
        <Kpi label="לא בשימוש" value={fmtNumber(summary.inactive)} icon={<IconX />} tone="neutral" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="עמידה ממוצעת" value={`${summary.avgCompliance}%`} icon={<IconScale />} tone="success" />
        <Kpi label="מתקנים בתקן (90%+)" value={fmtNumber(summary.compliant)} icon={<IconStar />} tone="accent" />
        <Kpi label="פריטים חסרים" value={fmtNumber(summary.totalGaps)} icon={<IconAlert />} tone="danger" />
        <Kpi label="פריטים בעודף" value={fmtNumber(summary.totalSurplus)} icon={<IconBoxes />} tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card card-padded">
          <h3 className="font-bold mb-3 flex items-center gap-2"><IconChart className="text-primary-600" /> סטטוס מתקנים</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChart} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name">
                  {statusChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-padded">
          <h3 className="font-bold mb-3 flex items-center gap-2"><IconScale className="text-primary-600" /> אחוז עמידה בתקן לפי פיקוד</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCommand} layout="vertical" margin={{ top: 10, right: 10, bottom: 10, left: 60 }}>
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="command" />
                <Tooltip />
                <Bar dataKey="compliance" fill="#1f4d7a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-padded">
          <h3 className="font-bold mb-3 flex items-center gap-2"><IconAlert className="text-primary-600" /> מספר חוסרים לפי פיקוד</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCommand}>
                <XAxis dataKey="command" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="gaps" fill="#c53030" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-padded">
          <h3 className="font-bold mb-3 flex items-center gap-2"><IconScroll className="text-primary-600" /> פילוח פערים לפי קטגוריה</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                  {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card card-padded">
          <h3 className="font-bold mb-3 flex items-center gap-2"><IconAlert className="text-primary-600" /> עשרת המתקנים עם הכי הרבה חוסרים</h3>
          {topFacilities.length === 0 ? (
            <div className="text-slate-500 text-sm">אין חוסרים</div>
          ) : (
            <table className="data-table">
              <tbody>
                {topFacilities.map((f) => (
                  <tr key={f.id}
                      className="clickable"
                      onClick={() => { window.location.href = `/facilities/${f.id}`; }}>
                    <td>
                      <strong>{f.name}</strong>
                      <div className="text-xs text-slate-500">{f.command} · {f.division}</div>
                    </td>
                    <td style={{ width: 160 }}><ComplianceCell pct={f.compliance.compliancePct} /></td>
                    <td className="font-num font-bold text-bad text-center" style={{ width: 80 }}>{fmtNumber(f.compliance.totalGap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card-padded">
          <h3 className="font-bold mb-3 flex items-center gap-2"><IconScroll className="text-primary-600" /> עשרת הפריטים החסרים ביותר</h3>
          {topItems.length === 0 ? (
            <div className="text-slate-500 text-sm">אין פריטים חסרים</div>
          ) : (
            <div className="space-y-2">
              {topItems.map(([name, count]) => {
                const max = topItems[0][1];
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
                      <span>{name}</span><strong>{fmtNumber(count)}</strong>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-bad rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
