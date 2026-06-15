'use client';
import type { FacilityFields } from '@/lib/types';
import { Field } from './fieldControls';

// Computes the missing mezuzot per area and in total (needed minus installed, never negative).
export function getMezuzotDeficit(f: FacilityFields) {
  const residential = Math.max(0, (f.mezuzotResidentialNeeded || 0) - (f.mezuzotResidentialInstalled || 0));
  const other = Math.max(0, (f.mezuzotOtherNeeded || 0) - (f.mezuzotOtherInstalled || 0));
  return { residential, other, total: residential + other };
}

export function MezuzotDeficit({ fields }: { fields: FacilityFields }) {
  const { residential, other, total } = getMezuzotDeficit(fields);
  const box = (v: number) => (
    <div className={`input font-num font-bold bg-slate-50 ${v > 0 ? 'text-bad' : 'text-ok'}`}>{v}</div>
  );
  return (
    <>
      <Field label="חוסר מזוזות (חדרי מגורים)">{box(residential)}</Field>
      <Field label="חוסר מזוזות (שאר דלתות)">{box(other)}</Field>
      <Field label={'סה״כ חוסר מזוזות'}>{box(total)}</Field>
    </>
  );
}
