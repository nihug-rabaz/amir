import type { ReactNode } from 'react';

export function Field({ label, req, error, children }: { label: string; req?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      {label && <label className="label">{label} {req && <span className="req">*</span>}</label>}
      <div className="mt-1">{children}</div>
      {error && <div className="text-[11px] text-bad mt-1">{error}</div>}
    </div>
  );
}

export function NumField({ label, val, set, error }: { label: string; val: number | undefined; set: (v: number) => void; error?: string }) {
  return (
    <Field label={label} error={error}>
      <input type="number" min={0} className="input" value={val ?? 0} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))} />
    </Field>
  );
}

export function Check({ label, val, set }: { label: string; val: boolean; set: (v: boolean) => void }) {
  return (
    <div>
      <label className="label opacity-0 select-none">·</label>
      <label className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition">
        <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
        <span className="text-sm font-medium">{label}</span>
      </label>
    </div>
  );
}
