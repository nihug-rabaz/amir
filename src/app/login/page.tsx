'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { ROLE_LABELS } from '@/lib/catalog';
import { isValidAuthCode, normalizeIsraeliID } from '@/lib/israeli-id';
import type { User } from '@/lib/types';
import { BrandMark } from '@/components/BrandMark';
import { DeveloperCredit } from '@/components/DeveloperCredit';

type Step = 'id' | 'code';

function idsMatch(a: string, b: string) {
  const left = normalizeIsraeliID(a);
  const right = normalizeIsraeliID(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.replace(/^0+/, '') === right.replace(/^0+/, '');
}

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
  const [step, setStep] = useState<Step>('id');
  const [code, setCode] = useState('');
  const [sessionCookie, setSessionCookie] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/users', { cache: 'no-store' })
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

  function findUserIn(list: User[], idNumber: string): User | undefined {
    return list.find((x) => idsMatch(x.personalId, idNumber));
  }

  // Reloads active users from the API when the in-memory list misses the ID after MyIDF success.
  async function resolveUser(idNumber: string): Promise<User | undefined> {
    const existing = findUserIn(users, idNumber);
    if (existing) return existing;
    const r = await fetch('/api/users', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const list = ((j.users || []) as User[]).filter((u) => u.active);
    setUsers(list);
    setLoadError(null);
    return findUserIn(list, idNumber);
  }

  async function start() {
    const idNumber = personalId.trim();
    if (!idNumber) return toastRef.current.danger('שגיאה', 'יש להזין ת״ז');

    if (method === 'card') {
      if (loading) return toastRef.current.danger('טוען', 'רשימת המשתמשים עדיין נטענת');
      if (loadError) return toastRef.current.danger('שגיאה', loadError);
      try {
        const u = await resolveUser(idNumber);
        if (!u) return toastRef.current.danger('משתמש לא נמצא', 'אין משתמש פעיל עם מספר זהות זה');
        pick(u);
      } catch {
        toastRef.current.danger('שגיאה', 'לא ניתן לטעון משתמשים. נסה לרענן.');
      }
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/myidf/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idNumber }),
      });
      const data = await response.json() as { isValid?: boolean; mobilePhone?: string; sessionCookie?: string; error?: string };
      if (!response.ok || data.isValid !== true || !data.sessionCookie) {
        toastRef.current.danger('משתמש לא קיים ב-MyIDF', data.error || 'לא התקבל אישור עבור מספר הזהות');
        return;
      }
      setSessionCookie(data.sessionCookie);
      setMaskedPhone(data.mobilePhone || '');
      setCode('');
      setStep('code');
      toastRef.current.success('קוד אימות נשלח', data.mobilePhone ? `נשלח למספר ${data.mobilePhone}` : 'נשלח לטלפון הרשום');
    } catch (e) {
      toastRef.current.danger('שגיאת MyIDF', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const idNumber = personalId.trim();
    const authCode = code.trim();
    if (!isValidAuthCode(authCode)) {
      return toastRef.current.danger('קוד לא תקין', 'הקוד מכיל 6 ספרות ו-2 אותיות (גדולה + קטנה)');
    }

    setBusy(true);
    try {
      const response = await fetch('/api/myidf/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idNumber, code: authCode, sessionCookie }),
      });
      const data = await response.json() as { isValid?: boolean; token?: string; error?: string };
      if (!response.ok || data.isValid !== true) {
        toastRef.current.danger('אימות נכשל', data.error || 'קוד האימות שגוי או שפג תוקפו');
        return;
      }

      const u = await resolveUser(idNumber);
      if (!u) {
        toastRef.current.danger('אין הרשאה באמי״ר', 'המשתמש אומת ב-MyIDF אך לא מוגדר כמשתמש פעיל במערכת');
        return;
      }
      pick(u);
    } catch (e) {
      toastRef.current.danger('שגיאת MyIDF', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function backToId() {
    setStep('id');
    setCode('');
    setSessionCookie('');
    setMaskedPhone('');
  }

  const inputClass = 'mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none';

  return (
    <div className="relative min-h-screen grid place-items-center p-6 text-white overflow-hidden">
      <Image
        src="/ui/login-atmosphere.jpg"
        alt=""
        fill
        priority
        className="object-cover scale-105 animate-soft-pulse"
        sizes="100vw"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,27,46,0.72) 0%, rgba(15,42,68,0.82) 55%, rgba(10,27,46,0.92) 100%)',
        }}
        aria-hidden
      />
      <div
        className="relative w-[420px] max-w-[92vw] bg-white/8 border border-white/15 rounded-2xl p-8 shadow-2xl backdrop-blur-md transition animate-fade-up"
        style={{ opacity: fade ? 0 : 1, transform: fade ? 'translateY(-8px)' : 'none' }}
      >
        <BrandMark size={72} priority className="mb-5 shadow-[0_12px_30px_rgba(212,175,55,0.35)]" />
        <h1 className="text-[28px] sm:text-[32px] font-extrabold m-0 tracking-tight">אמי״ר 2.0</h1>
        <div className="text-slate-200 text-sm mt-2 leading-relaxed">
          {step === 'code'
            ? 'אימות קוד SMS · שלב 2 מתוך 2'
            : method === 'myidf'
              ? 'ארגון מרחב ייעודי רבנותי · אימות MyIDF'
              : 'ארגון מרחב ייעודי רבנותי · התחברות מאובטחת'}
        </div>

        {step === 'id' ? (
          <>
            <div className="mt-6 space-y-3">
              <div>
                <label className="text-slate-300 text-xs font-semibold">ת״ז</label>
                <input
                  className={inputClass}
                  value={personalId}
                  onChange={(e) => setPersonalId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !busy) start(); }}
                  placeholder="הזן ת״ז"
                  autoComplete="off"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-slate-300 text-xs font-semibold">אמצעי הזדהות</label>
                <select
                  className={inputClass}
                  value={method}
                  onChange={(e) => setMethod(e.target.value as 'myidf' | 'card')}
                >
                  <option value="myidf">MyIDF</option>
                  <option value="card">תעודת זהות</option>
                </select>
              </div>
            </div>

            {loadError && (
              <div className="mt-3 text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
                {loadError}
              </div>
            )}

            <button
              onClick={start}
              disabled={busy || (method === 'card' && loading)}
              className="mt-4 w-full justify-center btn btn-accent"
            >
              {busy ? 'שולח...' : method === 'myidf' ? 'שלח קוד אימות' : 'התחבר למערכת'}
            </button>
          </>
        ) : (
          <>
            {maskedPhone && (
              <div className="mt-4 text-center text-slate-300 text-sm">קוד נשלח למספר {maskedPhone}</div>
            )}
            <div className="mt-5">
              <label className="text-slate-300 text-xs font-semibold">קוד אימות</label>
              <input
                className={`${inputClass} text-center tracking-[0.3em] font-bold`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) verify(); }}
                placeholder="הזן קוד אימות (8 תווים)"
                autoComplete="one-time-code"
                maxLength={8}
                autoFocus
              />
              <div className="text-[11px] text-slate-400 mt-1.5">הקוד מכיל 6 ספרות ו-2 אותיות (גדולה + קטנה)</div>
            </div>

            <button
              onClick={verify}
              disabled={busy}
              className="mt-4 w-full justify-center btn btn-primary"
              style={{ background: '#16a34a' }}
            >
              {busy ? 'מאמת...' : 'אמת קוד'}
            </button>

            <button
              onClick={backToId}
              disabled={busy}
              className="mt-3 w-full text-center text-slate-300 hover:text-white text-sm transition"
            >
              ← חזור להזנת ת.ז.
            </button>
          </>
        )}
      </div>

      <DeveloperCredit tone="dark" className="relative mt-6 max-w-[420px] w-full justify-center px-2" />
    </div>
  );
}
