'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { filterFacilities } from '@/lib/permissions';
import type { FacilityWithCompliance } from '@/lib/types';
import { COMMANDS, ITEM_CATEGORIES } from '@/lib/catalog';
import { fmtNumber } from '@/lib/format';
import { DataTable, type DataColumn } from '@/components/DataTable';
import { GapStatusBadge } from '@/components/StatusPill';
import { IconAlert, IconBoxes, IconBuilding, IconScroll } from '@/components/Icon';
import { Kpi } from '@/components/Kpi';

export default function GapsPage() {
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

  const rows = useMemo(() => {
    const out: Array<{
      id: string; facilityId: string; facilityName: string; command: string; division: string;
      item: string; category: string; required: number; actual: number; gap: number; status: 'missing' | 'surplus';
    }> = [];
    for (const f of filterFacilities(user, facilities)) {
      for (const r of f.compliance.rows) {
        if (r.status === 'missing' || r.status === 'surplus') {
          out.push({
            id: `${f.id}_${r.itemId}`,
            facilityId: f.id, facilityName: f.name,
            command: f.command, division: f.division || '—',
            item: r.name, category: ITEM_CATEGORIES[r.category] || r.category,
            required: r.required, actual: r.actual, gap: r.gap, status: r.status,
          });
        }
      }
    }
    return out;
  }, [user, facilities]);

  const missing = rows.filter((r) => r.status === 'missing');
  const surplus = rows.filter((r) => r.status === 'surplus');
  const totalMissingUnits = missing.reduce((s, r) => s + r.gap, 0);
  const totalSurplusUnits = surplus.reduce((s, r) => s + Math.abs(r.gap), 0);

  const columns: DataColumn<typeof rows[number]>[] = [
    { key: 'facilityName', label: 'מתקן', render: (r) => <strong>{r.facilityName}</strong> },
    { key: 'command', label: 'פיקוד' },
    { key: 'division', label: 'אוגדה' },
    { key: 'item', label: 'פריט' },
    { key: 'category', label: 'קטגוריה' },
    { key: 'required', label: 'תקן', center: true },
    { key: 'actual', label: 'קיים', center: true },
    {
      key: 'gap', label: 'פער', center: true,
      render: (r) => <strong style={{ color: r.gap > 0 ? '#c53030' : '#2563eb' }}>{r.gap > 0 ? `-${r.gap}` : `+${Math.abs(r.gap)}`}</strong>,
    },
    { key: 'status', label: 'סטטוס', render: (r) => <GapStatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">פערים וחוסרים</h1>
          <div className="text-sm text-slate-500 mt-1">תצוגה מאוחדת של כל הפערים מול תקני רבצ״ר</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="פריטים חסרים" value={fmtNumber(missing.length)} icon={<IconAlert />} tone="danger" delta={`${fmtNumber(totalMissingUnits)} יחידות בסה״כ`} />
        <Kpi label="פריטים בעודף" value={fmtNumber(surplus.length)} icon={<IconBoxes />} tone="info" delta={`${fmtNumber(totalSurplusUnits)} יחידות בסה״כ`} />
        <Kpi label="מתקנים עם פערים" value={fmtNumber(new Set(missing.map((r) => r.facilityId)).size)} icon={<IconBuilding />} tone="warning" />
        <Kpi label="סוגי פריטים" value={fmtNumber(new Set(missing.map((r) => r.item)).size)} icon={<IconScroll />} tone="accent" />
      </div>

      {loading ? (
        <div className="card card-padded text-slate-500">טוען…</div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          searchableFields={['facilityName', 'item', 'command', 'division']}
          filters={[
            { key: 'command', label: 'פיקוד', options: COMMANDS.map((c) => ({ value: c, label: c })) },
            { key: 'status', label: 'סוג', options: [{ value: 'missing', label: 'חסר' }, { value: 'surplus', label: 'עודף' }] },
          ]}
          paginate
          pageSize={15}
          defaultSort={{ key: 'gap', dir: 'desc' }}
          onRowClick={(r) => router.push(`/facilities/${r.facilityId}`)}
        />
      )}
    </div>
  );
}
