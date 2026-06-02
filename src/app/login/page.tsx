'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { ROLE_LABELS } from '@/lib/catalog';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const { signIn, user } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [personalId, setPersonalId] = useState('');
  const [method, setMethod] = useState<'myidf' | 'card'>('myidf');
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/users')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => { if (active) { setUsers((j.users || []).filter((u: User) => u.active)); setLoadError(null); } })
      .catch(() => { if (active) setLoadError('לא ניתן לטעון משתמשים. ודא שהשרת פועל ונסה לרענן.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (user) return null;

  function pick(u: User) {
    setFade(true);
    setTimeout(() => {
      toastRef.current.success(`ברוך הבא, ${u.name}`, ROLE_LABELS[u.role]);
      signIn(u);
    }, 220);
  }

  function manualLogin() {
    if (!personalId.trim()) return toastRef.current.danger('שגיאה', 'יש להזין מספר אישי / ת״ז');
    const u = users.find((x) => x.personalId === personalId.trim());
    if (!u) return toastRef.current.danger('משתמש לא נמצא', 'בחר מהרשימה למטה');
    pick(u);
  }

  return (
    <div
      className="min-h-screen grid place-items-center p-6 text-white"
      style={{
        background:
          'radial-gradient(circle at 20% 20%, rgba(212,175,55,0.08), transparent 50%),' +
          'radial-gradient(circle at 80% 80%, rgba(31,77,122,0.18), transparent 50%),' +
          'linear-gradient(180deg, #0a1b2e 0%, #0f2a44 100%)',
      }}
    >
      <div
        className="w-[420px] max-w-[92vw] bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md transition"
        style={{ opacity: fade ? 0 : 1, transform: fade ? 'translateY(-8px)' : 'none' }}
      >
        <div
          className="w-16 h-16 rounded-2xl grid place-items-center font-extrabold text-2xl text-primary mb-4 shadow-[0_12px_30px_rgba(212,175,55,0.3)]"
          style={{ background: 'linear-gradient(135deg, #d4af37, #e6c768)' }}
        >
          אמ
        </div>
        <h1 className="text-[22px] font-extrabold m-0">אמי״ר 2.0</h1>
        <div className="text-slate-300 text-sm mt-1">ארגון מרחב ייעודי רבנותי · התחברות מאובטחת</div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-slate-300 text-xs font-semibold">מספר אישי / ת״ז</label>
            <input
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              value={personalId}
              onChange={(e) => setPersonalId(e.target.value)}
              placeholder="לדוגמה: 1101234"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-slate-300 text-xs font-semibold">אמצעי הזדהות</label>
            <select
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'myidf' | 'card')}
            >
              <option value="myidf">MyIDF</option>
              <option value="card">תעודת זהות</option>
            </select>
          </div>
        </div>

        <button
          onClick={manualLogin}
          className="mt-4 w-full justify-center btn btn-accent"
        >
          התחבר למערכת
        </button>

        <div className="mt-5 pt-4 border-t border-white/10">
          <h4 className="text-xs text-slate-300 font-semibold mb-2">כניסה מהירה (הדגמה)</h4>
          {loading ? (
            <div className="text-slate-400 text-sm">טוען משתמשים…</div>
          ) : loadError ? (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
              {loadError}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => pick(u)}
                  className="bg-white/5 border border-white/10 hover:bg-accent/12 hover:border-accent/30 text-white px-3 py-2 rounded-lg text-right text-xs flex items-center justify-between transition"
                >
                  <span>
                    <strong className="font-semibold">{u.name}</strong>
                    <span className="text-slate-300"> · {ROLE_LABELS[u.role]}</span>
                  </span>
                  <small className="text-slate-400 text-[10px]">{u.personalId}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
