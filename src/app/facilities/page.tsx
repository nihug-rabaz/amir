'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { filterFacilities } from '@/lib/permissions';
import type { FacilityWithCompliance } from '@/lib/types';
import { CAMP_TYPES, COMMANDS, FACILITY_STATUS } from '@/lib/catalog';
import { fmtDate, fmtNumber } from '@/lib/format';
import { DataTable, type DataColumn } from '@/components/DataTable';
import { ComplianceCell, StatusPill } from '@/components/StatusPill';
import { IconDownload, IconEdit, IconEye, IconPlus } from '@/components/Icon';

export default function FacilitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [facilities, setFacilities] = useState<FacilityWithCompliance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/facilities?with=compliance')
      .then((r) => r.json())
      .then((j) => setFacilities(j.facilities || []))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => filterFacilities(user, facilities).map((f) => ({
    id: f.id,
    name: f.name,
    command: f.command,
    division: f.division || '—',
    brigade: f.brigade || '—',
    battalion: f.battalion || '—',
    campType: f.campType || '—',
    status: f.status || '—',
    maxCapacity: f.maxCapacity,
    updatedAt: f.updatedAt,
    compliancePct: f.compliance.compliancePct,
    gaps: f.compliance.totalGap,
    active: f.active,
  })), [user, facilities]);

  function exportCsv() {
    const headers = ['שם מתקן', 'פיקוד', 'אוגדה', 'חטיבה', 'גדוד', 'סוג מחנה', 'סטטוס', 'סד״כ', 'עמידה %', 'חוסרים', 'עדכון'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      const cells = [r.name, r.command, r.division, r.brigade, r.battalion, r.campType, r.status, r.maxCapacity, r.compliancePct, r.gaps, fmtDate(r.updatedAt)]
        .map((c) => {
          const s = String(c ?? '').replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        });
      lines.push(cells.join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amir-facilities.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataColumn<typeof rows[number]>[] = [
    { key: 'name', label: 'שם המתקן', render: (r) => <span><strong>{r.name}</strong>{!r.active && <span className="badge mr-2">לא פעיל</span>}</span> },
    { key: 'command', label: 'פיקוד' },
    { key: 'division', label: 'אוגדה' },
    { key: 'brigade', label: 'חטיבה' },
    { key: 'battalion', label: 'גדוד' },
    { key: 'campType', label: 'סוג מחנה' },
    { key: 'status', label: 'סטטוס', render: (r) => <StatusPill status={r.status} /> },
    { key: 'maxCapacity', label: 'סד״כ', center: true, render: (r) => fmtNumber(r.maxCapacity) },
    { key: 'compliancePct', label: 'עמידה בתקן', render: (r) => <ComplianceCell pct={r.compliancePct} /> },
    { key: 'gaps', label: 'חוסרים', center: true, render: (r) => r.gaps > 0 ? <strong className="text-bad">{fmtNumber(r.gaps)}</strong> : <span className="text-slate-400">0</span> },
    { key: 'updatedAt', label: 'עדכון אחרון', render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.updatedAt)}</span>, sortValue: (r) => new Date(r.updatedAt).getTime() },
    {
      key: 'actions', label: '', sortable: false, render: (r) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Link href={`/facilities/${r.id}`} className="btn btn-sm btn-ghost"><IconEye size={14} /></Link>
          <Link href={`/facilities/${r.id}/edit`} className="btn btn-sm btn-ghost"><IconEdit size={14} /></Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">מתקנים</h1>
          <div className="text-sm text-slate-500 mt-1">רשימת המתקנים הרבנותיים בתחום אחריותך</div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn btn-ghost"><IconDownload /> ייצוא לאקסל</button>
          <Link href="/facilities/new" className="btn btn-primary"><IconPlus /> הוספת מתקן</Link>
        </div>
      </div>

      {loading ? (
        <div className="card card-padded text-slate-500">טוען…</div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          searchableFields={['name', 'command', 'division', 'brigade', 'battalion', 'campType']}
          filters={[
            { key: 'command', label: 'פיקוד', options: COMMANDS.map((c) => ({ value: c, label: c })) },
            { key: 'status',  label: 'סטטוס', options: FACILITY_STATUS.map((s) => ({ value: s, label: s })) },
            { key: 'campType', label: 'סוג מחנה', options: CAMP_TYPES.map((c) => ({ value: c, label: c })) },
          ]}
          paginate
          pageSize={12}
          defaultSort={{ key: 'compliancePct', dir: 'asc' }}
          onRowClick={(r) => router.push(`/facilities/${r.id}`)}
        />
      )}
    </div>
  );
}
