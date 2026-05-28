'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { filterFacilities } from '@/lib/permissions';
import type { Facility, FacilityWithCompliance, InventoryItem, StandardTier } from '@/lib/types';
import { ITEM_CATEGORIES } from '@/lib/catalog';
import { fmtNumber } from '@/lib/format';
import { GapStatusBadge } from '@/components/StatusPill';
import { IconBoxes, IconCheck, IconX } from '@/components/Icon';

export default function InventoryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const params = useSearchParams();
  const initialId = params.get('facility');

  const [facilities, setFacilities] = useState<FacilityWithCompliance[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [tiers, setTiers] = useState<StandardTier[]>([]);
  const [standards, setStandards] = useState<Record<string, Record<string, number>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [cat, setCat] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/facilities?with=compliance').then((r) => r.json()),
      fetch('/api/standards').then((r) => r.json()),
    ]).then(([f, s]) => {
      setFacilities(f.facilities || []);
      setItems(s.items || []);
      setTiers(s.tiers || []);
      setStandards(s.standards || {});
    });
  }, []);

  const visible = useMemo(() => filterFacilities(user, facilities).filter((f) => f.active), [user, facilities]);
  const selected: Facility | null = useMemo(() => visible.find((f) => f.id === selectedId) || null, [visible, selectedId]);
  const tier = useMemo(() => {
    if (!selected) return null;
    return tiers.find((t) => selected.maxCapacity >= t.min && selected.maxCapacity <= t.max) || tiers[tiers.length - 1] || null;
  }, [selected, tiers]);

  useEffect(() => {
    if (!selectedId) { setDraft({}); return; }
    fetch(`/api/facilities/${selectedId}/inventory`).then((r) => r.json()).then((j) => setDraft(j.inventory || {}));
  }, [selectedId]);

  function rowsForCategory(c: string) {
    const std = tier ? (standards[tier.id] || {}) : {};
    return items
      .filter((it) => c === 'all' || it.category === c)
      .map((it) => {
        const required = std[it.id] ?? 0;
        const actual = Number(draft[it.id] ?? 0);
        const gap = required - actual;
        let status: 'ok' | 'missing' | 'surplus' | 'not-relevant';
        if (required === 0) status = 'not-relevant';
        else if (gap > 0) status = 'missing';
        else if (gap < 0) status = 'surplus';
        else status = 'ok';
        return { ...it, required, actual, gap, status };
      });
  }

  const grouped = useMemo(() => {
    const list = rowsForCategory(cat);
    return list.reduce<Record<string, typeof list>>((acc, r) => {
      (acc[r.category] ||= []).push(r);
      return acc;
    }, {});
  }, [items, draft, tier, standards, cat]);

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/facilities/${selectedId}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: draft, actor: user }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      toast.success('המלאי נשמר', 'הנתונים עודכנו ותועדו ביומן');
    } catch (e) {
      toast.danger('שגיאה בשמירה', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">עדכון מלאי</h1>
          <div className="text-sm text-slate-500 mt-1">בחר מתקן, הזן כמויות מעודכנות והשווה לתקן רבצ״ר</div>
        </div>
      </div>

      <div className="card card-padded">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">בחר מתקן</label>
            <select className="input mt-1" value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value || null)}>
              <option value="">— בחר מתקן —</option>
              {visible.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.command}</option>)}
            </select>
          </div>
          {selected && (
            <>
              <div>
                <label className="label">סד״כ מתקן</label>
                <div className="input mt-1 bg-slate-50">{fmtNumber(selected.maxCapacity)}</div>
              </div>
              <div>
                <label className="label">תקן רלוונטי</label>
                <div className="input mt-1 bg-slate-50">{tier?.label || '—'}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="card card-padded text-center py-10 text-slate-500">
          <div className="text-4xl opacity-40 mb-2"><IconBoxes size={36} /></div>
          <h4 className="font-bold text-slate-900">בחר מתקן להתחיל</h4>
          <div className="text-xs mt-1">לאחר בחירת מתקן יוצגו רשימת הפריטים, התקן הנדרש והמלאי הנוכחי</div>
        </div>
      ) : (
        <>
          <div className="tabs">
            <div className={`tab ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>כל הקטגוריות</div>
            {Object.entries(ITEM_CATEGORIES).map(([k, v]) => (
              <div key={k} className={`tab ${cat === k ? 'active' : ''}`} onClick={() => setCat(k)}>{v}</div>
            ))}
          </div>

          <div className="space-y-3">
            {Object.entries(grouped).map(([cKey, rows]) => (
              <div key={cKey} className="card overflow-hidden">
                <div className="flex justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <strong>{ITEM_CATEGORIES[cKey] || cKey}</strong>
                  <small className="text-slate-500">{rows.length} פריטים</small>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="data-table min-w-[640px]">
                    <thead>
                      <tr>
                        <th>פריט</th>
                        <th className="text-center">תקן נדרש</th>
                        <th style={{ width: 140 }}>כמות במתקן</th>
                        <th className="text-center">פער</th>
                        <th>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className={r.gap > 0 ? 'bg-bad/5' : ''}>
                          <td><strong>{r.name}</strong></td>
                          <td className="text-center font-num">{fmtNumber(r.required)}</td>
                          <td>
                            <input
                              type="number" min={0} className="input text-center"
                              value={draft[r.id] ?? 0}
                              onChange={(e) => setDraft((d) => ({ ...d, [r.id]: Math.max(0, Number(e.target.value) || 0) }))}
                            />
                          </td>
                          <td className="text-center font-num font-bold" style={{ color: r.gap > 0 ? '#c53030' : r.gap < 0 ? '#2563eb' : '#64748b' }}>
                            {r.gap > 0 ? `-${r.gap}` : r.gap < 0 ? `+${Math.abs(r.gap)}` : '0'}
                          </td>
                          <td><GapStatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-200">
            <button onClick={() => setSelectedId(selectedId)} className="btn btn-ghost"><IconX /> ביטול</button>
            <button onClick={save} disabled={saving} className="btn btn-primary"><IconCheck /> {saving ? 'שומר...' : 'שמירת מלאי'}</button>
          </div>
        </>
      )}
    </div>
  );
}
