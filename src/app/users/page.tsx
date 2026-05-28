'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { canManageUsers } from '@/lib/permissions';
import { ROLE_LABELS, COMMANDS, divisionsFor } from '@/lib/catalog';
import type { Role, User } from '@/lib/types';
import { DataTable, type DataColumn } from '@/components/DataTable';
import { IconEdit, IconPlus, IconShield, IconX, IconCheck } from '@/components/Icon';

export default function UsersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const allowed = canManageUsers(user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | null>(null);

  useEffect(() => {
    if (!allowed) return;
    fetch('/api/users').then((r) => r.json()).then((j) => setUsers(j.users || [])).finally(() => setLoading(false));
  }, [allowed]);

  async function save(u: User) {
    const r = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    const j = await r.json();
    if (j.error) { toast.danger('שגיאה', j.error); return; }
    toast.success('המשתמש נשמר', u.name);
    setEditing(null);
    setUsers((arr) => {
      const idx = arr.findIndex((x) => x.id === u.id);
      if (idx >= 0) { const copy = [...arr]; copy[idx] = j.user; return copy; }
      return [...arr, j.user];
    });
  }

  if (!allowed) {
    return (
      <div className="card card-padded text-center py-10 text-slate-500">
        <div className="opacity-40 mb-3"><IconShield size={48} /></div>
        <h4 className="font-bold text-slate-900">גישה מוגבלת</h4>
        <div className="text-xs mt-1">רק מנהל מערכת רשאי לנהל משתמשים</div>
      </div>
    );
  }

  const rows = users.map((u) => ({
    ...u,
    roleLabel: ROLE_LABELS[u.role],
    scopeLabel: [u.scope.command, u.scope.division, u.scope.brigade, u.scope.battalion].filter(Boolean).join(' / ') || 'מלא',
  }));

  const columns: DataColumn<typeof rows[number]>[] = [
    { key: 'name', label: 'שם', render: (r) => <strong>{r.name}</strong> },
    { key: 'personalId', label: 'מספר אישי' },
    { key: 'roleLabel', label: 'תפקיד' },
    { key: 'scopeLabel', label: 'תחום אחריות' },
    { key: 'active', label: 'סטטוס', render: (r) => r.active ? <span className="badge badge-ok">פעיל</span> : <span className="badge">לא פעיל</span> },
    {
      key: 'actions', label: '', sortable: false, render: (r) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(r)}><IconEdit size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">משתמשים והרשאות</h1>
          <div className="text-sm text-slate-500 mt-1">ניהול משתמשים, תפקידים ויחידות משויכות</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({
          id: '', name: '', personalId: '', role: 'field_rabbi',
          scope: { command: null, division: null, brigade: null, battalion: null }, active: true,
        } as User)}>
          <IconPlus /> הוספת משתמש
        </button>
      </div>

      {loading ? (
        <div className="card card-padded text-slate-500">טוען…</div>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          searchableFields={['name', 'personalId', 'roleLabel']}
          filters={[{ key: 'role', label: 'תפקיד', options: Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l })) }]}
        />
      )}

      {editing && <UserEditor user={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function UserEditor({ user, onCancel, onSave }: { user: User; onCancel: () => void; onSave: (u: User) => void }) {
  const [u, setU] = useState<User>(user);

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-lift w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-lg">{user.id ? 'עריכת משתמש' : 'הוספת משתמש'}</h3>
          <button className="p-2 rounded-lg hover:bg-slate-100" onClick={onCancel}><IconX /></button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="שם מלא" req><input className="input" value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} /></Field>
          <Field label="מספר אישי / ת״ז" req><input className="input" value={u.personalId} onChange={(e) => setU({ ...u, personalId: e.target.value })} /></Field>
          <Field label="תפקיד">
            <select className="input" value={u.role} onChange={(e) => setU({ ...u, role: e.target.value as Role })}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="פיקוד (תחום אחריות)">
            <select className="input" value={u.scope.command || ''} onChange={(e) => setU({ ...u, scope: { ...u.scope, command: e.target.value || null, division: null } })}>
              <option value="">— ללא הגבלה —</option>
              {COMMANDS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="אוגדה">
            <select className="input" value={u.scope.division || ''} onChange={(e) => setU({ ...u, scope: { ...u.scope, division: e.target.value || null } })}>
              <option value="">— ללא —</option>
              {divisionsFor(u.scope.command).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="">
            <label className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={u.active} onChange={(e) => setU({ ...u, active: e.target.checked })} />
              משתמש פעיל
            </label>
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button className="btn btn-ghost" onClick={onCancel}><IconX /> ביטול</button>
          <button className="btn btn-primary" onClick={() => onSave(u)}><IconCheck /> שמירה</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label} {req && <span className="req">*</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
