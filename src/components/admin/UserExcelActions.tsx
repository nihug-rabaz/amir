'use client';
import { useRef, useState } from 'react';
import type { User } from '@/lib/types';
import type { UserExcelError } from '@/lib/userExcel';
import { Modal } from '@/components/Modal';
import { IconDownload, IconUpload } from '@/components/Icon';

interface Props {
  onImported: (users: User[]) => void;
  onError: (message: string) => void;
}

interface ImportResult {
  created: number;
  skipped: number;
  users: User[];
  errors: UserExcelError[];
}

export function UserExcelActions({ onImported, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function exportTemplate() {
    setBusy('export');
    try {
      const r = await fetch('/api/users/excel', { cache: 'no-store' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'amir-users-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function importFile(file: File) {
    setBusy('import');
    try {
      const body = new FormData();
      body.append('file', file);
      const r = await fetch('/api/users/excel', { method: 'POST', body });
      const j = await r.json() as ImportResult & { error?: string };
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      setResult(j);
      if (j.created > 0) onImported(j.users || []);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <>
      <button onClick={exportTemplate} className="btn btn-ghost" disabled={!!busy}>
        <IconDownload size={16} /> {busy === 'export' ? 'מייצא…' : 'ייצוא תבנית אקסל'}
      </button>
      <button onClick={() => fileRef.current?.click()} className="btn btn-ghost" disabled={!!busy}>
        <IconUpload size={16} /> {busy === 'import' ? 'מייבא…' : 'ייבוא אקסל'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importFile(file);
        }}
      />

      <Modal
        open={!!result}
        title="תוצאות ייבוא משתמשים"
        subtitle={result ? `נוצרו ${result.created} · נדחו ${result.skipped}` : ''}
        onClose={() => setResult(null)}
        width="640px"
        footer={<button className="btn btn-primary" onClick={() => setResult(null)}>סגור</button>}
      >
        {result && result.errors.length === 0 ? (
          <p className="m-0 text-sm text-slate-600">כל השורות בקובץ יובאו בהצלחה.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="w-16">שורה</th>
                  <th>שגיאה</th>
                </tr>
              </thead>
              <tbody>
                {result?.errors.map((err, i) => (
                  <tr key={`${err.row}-${i}`}>
                    <td className="font-num">{err.row}</td>
                    <td className="text-sm">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  );
}
