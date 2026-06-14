'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { assignedUsersFor, filterFacilities, isFieldUser } from '@/lib/permissions';
import { ROLE_LABELS, ITEM_CATEGORIES } from '@/lib/catalog';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { FacilityWithCompliance, User } from '@/lib/types';
import { Kpi } from '@/components/Kpi';
import { ComplianceCell, StatusPill } from '@/components/StatusPill';
import { UserFormModal } from '@/components/admin/UserFormModal';
import {
  IconAlert, IconBoxes, IconBuilding, IconCheck,
  IconEdit, IconEye, IconPlus, IconScale, IconSearch, IconShield, IconUsers, IconX,
} from '@/components/Icon';

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const initialUserId = params.get('user');
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<FacilityWithCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
  const [manageMode, setManageMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const reloadUsers = useCallback(() => {
    return fetch('/api/users').then((r) => r.json()).then((u) => setUsers(u.users || []));
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/facilities?with=compliance').then((r) => r.json()),
    ])
      .then(([u, f]) => {
        setUsers(u.users || []);
        setFacilities(f.facilities || []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  function selectUser(id: string | null) {
    setSelectedUserId(id);
    setManageMode(false);
    const url = id ? `/admin?user=${encodeURIComponent(id)}` : '/admin';
    router.replace(url, { scroll: false });
  }

  function openAddUser() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function openEditUser(u: User) {
    setEditingUser(u);
    setFormOpen(true);
  }

  function handleSaved(saved: User) {
    setFormOpen(false);
    reloadUsers();
    toast.success(editingUser ? 'המשתמש עודכן' : 'המשתמש נוסף', saved.name);
  }

  async function handleDelete(u: User) {
    if (!window.confirm(`למחוק את המשתמש "${u.name}"? פעולה זו אינה הפיכה.`)) return;
    try {
      const r = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
      if (selectedUserId === u.id) selectUser(null);
      reloadUsers();
      toast.success('המשתמש נמחק', u.name);
    } catch (e) {
      toast.danger('שגיאה במחיקה', (e as Error).message);
    }
  }

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? users.filter((u) =>
          u.name.toLowerCase().includes(q) ||
          u.personalId.toLowerCase().includes(q) ||
          (ROLE_LABELS[u.role] || '').toLowerCase().includes(q),
        )
      : users;
    const order: Record<string, number> = { admin: 0, unit_manager: 1, field_rabbi: 2, hq_viewer: 3 };
    return [...list].sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.name.localeCompare(b.name, 'he'));
  }, [users, search]);

  if (user && user.role !== 'admin') {
    return (
      <div className="card card-padded text-center py-10 text-slate-500">
        <div className="opacity-40 mb-3 inline-block"><IconShield size={48} /></div>
        <h4 className="font-bold text-slate-900">גישה מוגבלת</h4>
        <div className="text-xs mt-1">רק מנהל מערכת רשאי לצפות בסקירה זו</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">סקירת מנהל</h1>
          <div className="text-sm text-slate-500 mt-1">
            תצוגה מלאה של כל המתקנים, המשתמשים המשויכים והפערים — שלום {user?.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAddUser} className="btn btn-primary">
            <IconPlus size={16} /> הוספת משתמש
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden btn btn-ghost"
          >
            <IconUsers /> רשימת משתמשים
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <aside className="hidden lg:block">
          <UserPanel
            users={filteredUsers}
            selectedUserId={selectedUserId}
            manageMode={manageMode}
            search={search}
            setSearch={setSearch}
            onSelect={selectUser}
            onManage={() => { setSelectedUserId(null); setManageMode(true); }}
          />
        </aside>

        {drawerOpen && (
          <>
            <div className="fixed inset-0 bg-black/55 z-40 lg:hidden" onClick={() => setDrawerOpen(false)} />
            <aside className="fixed top-0 right-0 h-screen w-[300px] max-w-[85vw] z-50 lg:hidden bg-white shadow-2xl p-3 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <strong>בחירת משתמש</strong>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded hover:bg-slate-100"><IconX /></button>
              </div>
              <UserPanel
                users={filteredUsers}
                selectedUserId={selectedUserId}
                manageMode={manageMode}
                search={search}
                setSearch={setSearch}
                onSelect={(id) => { selectUser(id); setDrawerOpen(false); }}
                onManage={() => { setSelectedUserId(null); setManageMode(true); setDrawerOpen(false); }}
              />
            </aside>
          </>
        )}

        <section className="space-y-4 min-w-0">
          {loading ? (
            <div className="card card-padded text-slate-500">טוען נתונים…</div>
          ) : manageMode ? (
            <ManageUsersView
              users={filteredUsers}
              facilities={facilities}
              onAdd={openAddUser}
              onEdit={openEditUser}
              onDelete={handleDelete}
              onOpenSummary={(id) => selectUser(id)}
            />
          ) : selectedUser ? (
            <UserSummary user={selectedUser} facilities={facilities} users={users} onEdit={() => openEditUser(selectedUser)} onClear={() => selectUser(null)} />
          ) : (
            <AllFacilitiesView facilities={facilities} users={users} />
          )}
        </section>
      </div>

      <UserFormModal
        open={formOpen}
        initial={editingUser}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onError={(m) => toast.danger('שגיאה', m)}
      />
    </div>
  );
}

interface UserPanelProps {
  users: User[];
  selectedUserId: string | null;
  manageMode: boolean;
  search: string;
  setSearch: (v: string) => void;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}

function UserPanel({ users, selectedUserId, manageMode, search, setSearch, onSelect, onManage }: UserPanelProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-soft overflow-hidden lg:sticky lg:top-[80px]">
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <strong className="text-sm flex items-center gap-1.5"><IconUsers size={16} /> משתמשים</strong>
          <span className="text-xs text-slate-500">{users.length}</span>
        </div>
        <div className="relative">
          <input
            type="search"
            placeholder="חיפוש משתמש…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15"
          />
          <IconSearch className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        </div>
      </div>

      <button
        onClick={() => onSelect(null)}
        className={`w-full text-right px-3 py-2.5 border-b border-slate-100 text-sm transition ${
          selectedUserId === null && !manageMode ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <IconBuilding size={16} />
          <div className="flex-1">
            <div className="font-bold">כל המתקנים</div>
            <div className="text-xs text-slate-500">תצוגת על של כלל המערכת</div>
          </div>
        </div>
      </button>

      <button
        onClick={onManage}
        className={`w-full text-right px-3 py-2.5 border-b border-slate-100 text-sm transition ${
          manageMode ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <IconShield size={16} />
          <div className="flex-1">
            <div className="font-bold">ניהול משתמשים והרשאות</div>
            <div className="text-xs text-slate-500">הוספה, עריכה ומחיקה</div>
          </div>
        </div>
      </button>

      <div className="max-h-[60vh] lg:max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin">
        {users.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">לא נמצאו משתמשים</div>
        ) : users.map((u) => {
          const active = u.id === selectedUserId;
          return (
            <button
              key={u.id}
              onClick={() => onSelect(u.id)}
              className={`w-full text-right px-3 py-2.5 border-b border-slate-100 text-sm transition ${
                active ? 'bg-primary/5 border-r-4 border-r-primary' : 'hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-slate-900 truncate">{u.name}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-slate-500 truncate">{ROLE_LABELS[u.role]}</span>
                {!u.active && <span className="badge text-[10px]">לא פעיל</span>}
              </div>
              {(u.scope.command || u.scope.division) && (
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {[u.scope.command, u.scope.division, u.scope.brigade, u.scope.battalion].filter(Boolean).join(' / ')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ManageUsersProps {
  users: User[];
  facilities: FacilityWithCompliance[];
  onAdd: () => void;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
  onOpenSummary: (id: string) => void;
}

function ManageUsersView({ users, facilities, onAdd, onEdit, onDelete, onOpenSummary }: ManageUsersProps) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <strong className="flex items-center gap-1.5"><IconShield size={16} /> ניהול משתמשים והרשאות</strong>
        <button onClick={onAdd} className="btn btn-sm btn-primary"><IconPlus size={14} /> משתמש חדש</button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>שם מלא</th>
              <th>ת״ז</th>
              <th>תפקיד / הרשאה</th>
              <th>תחום אחריות</th>
              <th className="text-center">מתקנים</th>
              <th>סטטוס</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">לא נמצאו משתמשים</td></tr>
            ) : users.map((u) => {
              const scopeLabel = [u.scope.command, u.scope.division, u.scope.brigade, u.scope.battalion]
                .filter(Boolean).join(' / ') || 'כל המערכת';
              const count = filterFacilities(u, facilities).length;
              return (
                <tr key={u.id}>
                  <td>
                    <button onClick={() => onOpenSummary(u.id)} className="font-bold hover:text-primary text-right">{u.name}</button>
                  </td>
                  <td className="font-num text-sm">{u.personalId}</td>
                  <td className="text-sm">{ROLE_LABELS[u.role]}</td>
                  <td className="text-xs text-slate-600">{scopeLabel}</td>
                  <td className="text-center font-num">{fmtNumber(count)}</td>
                  <td>
                    {u.active
                      ? <span className="badge badge-ok">פעיל</span>
                      : <span className="badge">לא פעיל</span>}
                  </td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => onEdit(u)} className="btn btn-sm btn-ghost" title="עריכה"><IconEdit size={14} /></button>
                      <button onClick={() => onDelete(u)} className="btn btn-sm btn-ghost text-bad" title="מחיקה"><IconX size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllFacilitiesView({ facilities, users }: { facilities: FacilityWithCompliance[]; users: User[] }) {
  const totals = useMemo(() => ({
    facilities: facilities.length,
    users: users.filter((u) => u.active).length,
    fieldUsers: users.filter((u) => u.active && isFieldUser(u)).length,
    totalGaps: facilities.reduce((s, f) => s + f.compliance.totalGap, 0),
    avgCompliance: facilities.length === 0
      ? 0
      : Math.round(facilities.reduce((s, f) => s + f.compliance.compliancePct, 0) / facilities.length),
  }), [facilities, users]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="סה״כ מתקנים"     value={fmtNumber(totals.facilities)}    icon={<IconBuilding />} tone="info" />
        <Kpi label="עמידה ממוצעת"   value={`${totals.avgCompliance}%`}      icon={<IconScale />}    tone="success" />
        <Kpi label="פריטים חסרים"   value={fmtNumber(totals.totalGaps)}     icon={<IconAlert />}    tone="danger" />
        <Kpi label="משתמשי שטח"     value={fmtNumber(totals.fieldUsers)}    icon={<IconUsers />}    tone="accent" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <strong>כל המתקנים — כולל הרב/משתמש המשויך</strong>
          <span className="text-xs text-slate-500">{facilities.length} שורות</span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>מתקן</th>
                <th>פיקוד</th>
                <th>אוגדה</th>
                <th>חטיבה</th>
                <th>גדוד</th>
                <th>סטטוס</th>
                <th className="text-center">סד״כ</th>
                <th>עמידה בתקן</th>
                <th className="text-center">חוסרים</th>
                <th>רב / משתמש משויך</th>
                <th>עדכון אחרון</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facilities.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-slate-500">אין מתקנים להצגה</td></tr>
              ) : facilities.map((f) => {
                const assigned = assignedUsersFor(f, users);
                return (
                  <tr key={f.id}>
                    <td><Link href={`/facilities/${f.id}`} className="font-bold hover:text-primary">{f.name}</Link></td>
                    <td>{f.command}</td>
                    <td>{f.division || '—'}</td>
                    <td>{f.brigade || '—'}</td>
                    <td>{f.battalion || '—'}</td>
                    <td><StatusPill status={f.status} /></td>
                    <td className="text-center font-num">{fmtNumber(f.maxCapacity)}</td>
                    <td><ComplianceCell pct={f.compliance.compliancePct} /></td>
                    <td className="text-center">
                      {f.compliance.totalGap > 0
                        ? <strong className="text-bad">{fmtNumber(f.compliance.totalGap)}</strong>
                        : <span className="text-slate-400">0</span>}
                    </td>
                    <td>
                      {assigned.length === 0 ? (
                        <span className="text-xs text-slate-400">— ללא שיוך —</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {assigned.slice(0, 2).map((u) => (
                            <span key={u.id} className="text-xs">
                              <strong>{u.name}</strong>
                              <span className="text-slate-500"> · {ROLE_LABELS[u.role]}</span>
                            </span>
                          ))}
                          {assigned.length > 2 && (
                            <span className="text-[11px] text-slate-400">+ {assigned.length - 2} נוספים</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="text-xs text-slate-500">{fmtDate(f.updatedAt)}</td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <Link href={`/facilities/${f.id}`}      className="btn btn-sm btn-ghost"><IconEye  size={14} /></Link>
                        <Link href={`/facilities/${f.id}/edit`} className="btn btn-sm btn-ghost"><IconEdit size={14} /></Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function UserSummary({ user, facilities, users, onEdit, onClear }: { user: User; facilities: FacilityWithCompliance[]; users: User[]; onEdit: () => void; onClear: () => void }) {
  const assigned = useMemo(() => filterFacilities(user, facilities), [user, facilities]);

  const stats = useMemo(() => {
    const total = assigned.length;
    const active = assigned.filter((f) => f.status === 'תקין - בשימוש').length;
    const totalGap = assigned.reduce((s, f) => s + f.compliance.totalGap, 0);
    const totalSurplus = assigned.reduce((s, f) => s + f.compliance.totalSurplus, 0);
    const avgCompliance = total === 0
      ? 0
      : Math.round(assigned.reduce((s, f) => s + f.compliance.compliancePct, 0) / total);
    const compliant = assigned.filter((f) => f.compliance.compliancePct >= 90).length;
    return { total, active, totalGap, totalSurplus, avgCompliance, compliant };
  }, [assigned]);

  const itemGaps = useMemo(() => {
    const map: Record<string, { name: string; category: string; gap: number }> = {};
    for (const f of assigned) {
      for (const r of f.compliance.rows) {
        if (r.gap > 0) {
          const cur = map[r.itemId] || { name: r.name, category: r.category, gap: 0 };
          cur.gap += r.gap;
          map[r.itemId] = cur;
        }
      }
    }
    return Object.values(map).sort((a, b) => b.gap - a.gap);
  }, [assigned]);

  const scopeLabel = [user.scope.command, user.scope.division, user.scope.brigade, user.scope.battalion]
    .filter(Boolean).join(' / ') || 'כל המערכת';

  return (
    <>
      <div
        className="rounded-xl p-5 text-white shadow-card"
        style={{ background: 'linear-gradient(135deg, #0f2a44 0%, #1f4d7a 100%)' }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-full grid place-items-center font-extrabold text-primary text-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #d4af37, #e6c768)' }}
            >
              {user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold m-0 truncate">{user.name}</h2>
              <div className="text-xs sm:text-sm opacity-80 mt-0.5">
                {ROLE_LABELS[user.role]} · ת״ז {user.personalId}
                {!user.active && <span className="mr-2 badge bg-white/20 text-white border-0">לא פעיל</span>}
              </div>
              <div className="text-xs opacity-70 mt-0.5">תחום אחריות: {scopeLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onEdit} className="btn btn-ghost text-white border-white/20 bg-white/10 hover:bg-white/20">
              <IconEdit size={14} /> עריכת משתמש
            </button>
            <button onClick={onClear} className="btn btn-ghost text-white border-white/20 bg-white/10 hover:bg-white/20">
              <IconX size={14} /> חזרה לכל המתקנים
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="מתקנים בתחום אחריות" value={fmtNumber(stats.total)}      icon={<IconBuilding />} tone="info" />
        <Kpi label="עמידה ממוצעת"       value={`${stats.avgCompliance}%`}    icon={<IconScale />}    tone="success" />
        <Kpi label="פריטים חסרים"       value={fmtNumber(stats.totalGap)}    icon={<IconAlert />}    tone="danger" />
        <Kpi label="פריטים בעודף"       value={fmtNumber(stats.totalSurplus)} icon={<IconBoxes />}    tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Kpi label="מתקנים פעילים"      value={fmtNumber(stats.active)}    icon={<IconCheck />}    tone="success" />
        <Kpi label="מתקנים בתקן (90%+)" value={fmtNumber(stats.compliant)} icon={<IconScale />}    tone="accent" />
        <Kpi label="סוגי פריטים בחוסר"  value={fmtNumber(itemGaps.length)} icon={<IconBoxes />}    tone="warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <strong>מתקנים בתחום האחריות</strong>
            <span className="text-xs text-slate-500 mr-2">{assigned.length}</span>
          </div>
          {assigned.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">אין מתקנים בתחום אחריות זה</div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="data-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>מתקן</th>
                    <th>רב המתקן</th>
                    <th>שיוך</th>
                    <th>סטטוס</th>
                    <th className="text-center">סד״כ</th>
                    <th>עמידה בתקן</th>
                    <th className="text-center">חוסרים</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assigned.map((f) => {
                    const rabbis = assignedUsersFor(f, users);
                    return (
                      <tr key={f.id}>
                        <td><Link href={`/facilities/${f.id}`} className="font-bold hover:text-primary">{f.name}</Link></td>
                        <td className="text-xs">
                          {rabbis.length === 0 ? (
                            <span className="text-slate-400">— ללא —</span>
                          ) : (
                            <strong>{rabbis[0].name}</strong>
                          )}
                        </td>
                        <td className="text-xs">
                          {f.command}
                          {f.division ? ` · ${f.division}` : ''}
                          {f.brigade ? ` · ${f.brigade}` : ''}
                        </td>
                        <td><StatusPill status={f.status} /></td>
                        <td className="text-center font-num">{fmtNumber(f.maxCapacity)}</td>
                        <td><ComplianceCell pct={f.compliance.compliancePct} /></td>
                        <td className="text-center">
                          {f.compliance.totalGap > 0
                            ? <strong className="text-bad">{fmtNumber(f.compliance.totalGap)}</strong>
                            : <span className="text-slate-400">0</span>}
                        </td>
                        <td>
                          <div className="flex gap-1 justify-end">
                            <Link href={`/facilities/${f.id}`} className="btn btn-sm btn-ghost"><IconEye size={14} /></Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <strong>סיכום פערים בפריטים</strong>
            <span className="text-xs text-slate-500 mr-2">{itemGaps.length}</span>
          </div>
          {itemGaps.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">אין פריטים בחוסר</div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr><th>פריט</th><th>קטגוריה</th><th className="text-center">חוסר</th></tr>
                </thead>
                <tbody>
                  {itemGaps.map((r) => (
                    <tr key={r.name}>
                      <td><strong>{r.name}</strong></td>
                      <td className="text-xs text-slate-500">{ITEM_CATEGORIES[r.category] || r.category}</td>
                      <td className="text-center font-num font-bold text-bad">{fmtNumber(r.gap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
