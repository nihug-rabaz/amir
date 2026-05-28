'use client';
import { useEffect, useState } from 'react';
import type { AuditEntry } from '@/lib/types';
import { fmtDateTime } from '@/lib/format';
import { DataTable, type DataColumn } from '@/components/DataTable';

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit').then((r) => r.json()).then((j) => setEntries(j.entries || [])).finally(() => setLoading(false));
  }, []);

  const columns: DataColumn<AuditEntry>[] = [
    { key: 'timestamp', label: 'תאריך ושעה', render: (r) => fmtDateTime(r.timestamp), sortValue: (r) => new Date(r.timestamp).getTime() },
    { key: 'user', label: 'משתמש', render: (r) => <strong>{r.user}</strong> },
    { key: 'action', label: 'פעולה', render: (r) => <span className="badge badge-info">{r.action}</span> },
    { key: 'entity', label: 'ישות' },
    { key: 'summary', label: 'תיאור' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold m-0">יומן שינויים</h1>
        <div className="text-sm text-slate-500 mt-1">תיעוד כל פעולות המשתמשים במערכת</div>
      </div>
      {loading ? (
        <div className="card card-padded text-slate-500">טוען…</div>
      ) : (
        <DataTable
          rows={entries}
          columns={columns}
          searchableFields={['user', 'summary', 'action', 'entity']}
          filters={[
            { key: 'action', label: 'פעולה', options: [
              { value: 'create', label: 'יצירה' },
              { value: 'update', label: 'עדכון' },
              { value: 'update-inventory', label: 'עדכון מלאי' },
            ]},
            { key: 'entity', label: 'ישות', options: [
              { value: 'facility', label: 'מתקן' },
              { value: 'standards', label: 'תקנים' },
              { value: 'user', label: 'משתמש' },
            ]},
          ]}
          paginate
          pageSize={20}
          defaultSort={{ key: 'timestamp', dir: 'desc' }}
        />
      )}
    </div>
  );
}
