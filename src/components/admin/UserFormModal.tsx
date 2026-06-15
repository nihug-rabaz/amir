'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Facility, Role, User } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/catalog';
import { commandOptions, divisionOptions, brigadeOptions, battalionOptions } from '@/lib/scopeOptions';
import { uid } from '@/lib/format';
import { Modal } from '@/components/Modal';
import { IconCheck } from '@/components/Icon';

interface Props {
  open: boolean;
  initial?: User | null;
  facilities?: Pick<Facility, 'command' | 'division' | 'brigade' | 'battalion'>[];
  onClose: () => void;
  onSaved: (user: User) => void;
  onError: (message: string) => void;
}

const ROLES: Role[] = ['admin', 'unit_manager', 'field_rabbi', 'hq_viewer'];
const ROLE_HINTS: Record<Role, string> = {
  admin: 'גישה מלאה לכל המערכת — לרוב ללא הגבלת פיקוד',
  hq_viewer: 'צפייה בכל המערכת ללא עריכה',
  unit_manager: 'ניהול מתקנים בתחום היחידה שייבחר למטה',
  field_rabbi: 'רב/קצין דת האחראי על מתקנים בתחום שייבחר',
};

function blank(): User {
  return {
    id: '', name: '', personalId: '', role: 'field_rabbi',
    scope: { command: null, division: null, brigade: null, battalion: null },
    active: true, email: '',
  };
}

export function UserFormModal({ open, initial, facilities = [], onClose, onSaved, onError }: Props) {
  const [form, setForm] = useState<User>(() => initial ? { ...initial } : blank());
  const [saving, setSaving] = useState(false);

  // Reload the existing user's data each time the modal is opened.
  useEffect(() => {
    if (open) setForm(initial ? { ...initial, scope: { ...initial.scope } } : blank());
  }, [open, initial]);

  const commands = useMemo(() => commandOptions(facilities), [facilities]);
  const divisions = useMemo(() => divisionOptions(facilities, form.scope.command), [facilities, form.scope.command]);
  const brigades = useMemo(() => brigadeOptions(facilities, form.scope.command, form.scope.division), [facilities, form.scope.command, form.scope.division]);
  const battalions = useMemo(() => battalionOptions(facilities, form.scope.command, form.scope.division, form.scope.brigade), [facilities, form.scope.command, form.scope.division, form.scope.brigade]);

  function setField<K extends keyof User>(key: K, value: User[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Updating a scope level resets the deeper levels to keep the hierarchy consistent.
  function setScope(level: 'command' | 'division' | 'brigade' | 'battalion', value: string) {
    setForm((f) => {
      const scope = { ...f.scope, [level]: value || null };
      if (level === 'command') { scope.division = null; scope.brigade = null; scope.battalion = null; }
      if (level === 'division') { scope.brigade = null; scope.battalion = null; }
      if (level === 'brigade') { scope.battalion = null; }
      return { ...f, scope };
    });
  }

  async function save() {
    if (!form.name.trim()) return onError('יש להזין שם מלא');
    if (!form.personalId.trim()) return onError('יש להזין ת״ז');

    const payload: User = {
      ...form,
      id: form.id || uid('u'),
      name: form.name.trim(),
      personalId: form.personalId.trim(),
      email: form.email?.trim() || null,
    };

    setSaving(true);
    try {
      const r = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      onSaved(j.user as User);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const labelCls = 'text-xs font-semibold text-slate-600';
  const inputCls = 'mt-1 input';

  return (
    <Modal
      open={open}
      title={initial ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
      subtitle={initial ? `${initial.name} · ${initial.personalId}` : 'מילוי פרטי המשתמש וההרשאות'}
      onClose={onClose}
      width="600px"
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost" disabled={saving}>ביטול</button>
          <button onClick={save} className="btn btn-primary" disabled={saving}>
            <IconCheck size={16} /> {saving ? 'שומר...' : 'שמירה'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>שם מלא <span className="text-bad">*</span></label>
          <input className={inputCls} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="לדוגמה: הרב ישראל ישראלי" />
        </div>
        <div>
          <label className={labelCls}>ת״ז <span className="text-bad">*</span></label>
          <input className={inputCls} value={form.personalId} onChange={(e) => setField('personalId', e.target.value)} placeholder="לדוגמה: 1101234" inputMode="numeric" autoComplete="off" />
        </div>

        <div>
          <label className={labelCls}>תפקיד / הרשאה</label>
          <select className={inputCls} value={form.role} onChange={(e) => setField('role', e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>דוא״ל (אופציונלי)</label>
          <input className={inputCls} value={form.email || ''} onChange={(e) => setField('email', e.target.value)} placeholder="name@idf.il" type="email" autoComplete="off" />
        </div>
      </div>

      <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-3">
        {ROLE_HINTS[form.role]}
      </div>

      <div className="mt-4">
        <div className="text-xs font-bold text-slate-700 mb-2">תחום אחריות (היררכיית יחידה)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>פיקוד</label>
            <select className={inputCls} value={form.scope.command || ''} onChange={(e) => setScope('command', e.target.value)}>
              <option value="">— כל הפיקודים —</option>
              {commands.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>אוגדה</label>
            <select className={inputCls} value={form.scope.division || ''} onChange={(e) => setScope('division', e.target.value)}>
              <option value="">— כל האוגדות —</option>
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>חטיבה</label>
            <select className={inputCls} value={form.scope.brigade || ''} onChange={(e) => setScope('brigade', e.target.value)}>
              <option value="">— כל החטיבות —</option>
              {brigades.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>גדוד</label>
            <select className={inputCls} value={form.scope.battalion || ''} onChange={(e) => setScope('battalion', e.target.value)}>
              <option value="">— כל הגדודים —</option>
              {battalions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)} className="w-4 h-4" />
        <span className="text-sm text-slate-700">משתמש פעיל (יכול להתחבר ומשויך למתקנים)</span>
      </label>
    </Modal>
  );
}
