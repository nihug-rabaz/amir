'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { canManageStandards } from '@/lib/permissions';
import type { InventoryItem, StandardTier } from '@/lib/types';
import { ITEM_CATEGORIES } from '@/lib/catalog';
import { Kpi } from '@/components/Kpi';
import { IconCheck, IconScale } from '@/components/Icon';

export default function StandardsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = canManageStandards(user);
  const itemQuery = (useSearchParams().get('q') || '').trim().toLowerCase();

  const [tiers, setTiers] = useState<StandardTier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [standards, setStandards] = useState<Record<string, Record<string, number>>>({});
  const [cat, setCat] = useState<string>('all');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    fetch('/api/standards').then((r) => r.json()).then((j) => {
      setTiers(j.tiers || []);
      setItems(j.items || []);
      const std = j.standards || {};
      setStandards(std);
      setOriginal(JSON.parse(JSON.stringify(std)));
    });
  }, []);

  const filteredItems = useMemo(
    () => items.filter((it) =>
      (cat === 'all' || it.category === cat) &&
      (!itemQuery || it.name.toLowerCase().includes(itemQuery)),
    ),
    [items, cat, itemQuery],
  );

  function setVal(tierId: string, itemId: string, qty: number) {
    setStandards((s) => ({ ...s, [tierId]: { ...(s[tierId] || {}), [itemId]: qty } }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const changes: Array<{ tierId: string; itemId: string; qty: number }> = [];
      for (const t of tiers) {
        for (const it of items) {
          const cur = standards[t.id]?.[it.id] ?? 0;
          const old = original[t.id]?.[it.id] ?? 0;
          if (cur !== old) changes.push({ tierId: t.id, itemId: it.id, qty: cur });
        }
      }
      const r = await fetch('/api/standards', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, actor: user }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      toast.success('תקנים נשמרו', `עודכנו ${changes.length} ערכים`);
      setOriginal(JSON.parse(JSON.stringify(standards)));
      setDirty(false);
    } catch (e) {
      toast.danger('שגיאת שמירה', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold m-0">תקני רבצ״ר (חוקה)</h1>
          <div className="text-sm text-slate-500 mt-1">ניהול מדרגות תקן והכמויות הנדרשות לכל פריט</div>
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <button onClick={save} disabled={!dirty || saving} className="btn btn-primary">
              <IconCheck /> {saving ? 'שומר...' : 'שמירה'}
            </button>
          ) : (
            <span className="badge badge-warn">מצב צפייה בלבד</span>
          )}
        </div>
      </div>

      <div className="card card-padded">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {tiers.map((t) => (
            <Kpi key={t.id} label={t.label} value={`${t.min}-${t.max === 99999 ? '∞' : t.max}`} icon={<IconScale />} tone="accent" delta="חיילים" />
          ))}
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>כל הקטגוריות</div>
        {Object.entries(ITEM_CATEGORIES).map(([k, v]) => (
          <div key={k} className={`tab ${cat === k ? 'active' : ''}`} onClick={() => setCat(k)}>{v}</div>
        ))}
      </div>

      <div className="card overflow-x-auto scrollbar-thin">
        <table className="data-table min-w-[640px]">
          <thead>
            <tr>
              <th style={{ width: 240 }}>פריט</th>
              {tiers.map((t) => <th key={t.id} className="text-center">{t.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  <div className="text-xs text-slate-500">{ITEM_CATEGORIES[item.category]} · {item.unit}</div>
                </td>
                {tiers.map((t) => (
                  <td key={t.id} className="text-center">
                    {canEdit ? (
                      <input
                        type="number" min={0}
                        className="input text-center mx-auto"
                        style={{ width: 80 }}
                        value={standards[t.id]?.[item.id] ?? 0}
                        onChange={(e) => setVal(t.id, item.id, Math.max(0, Number(e.target.value) || 0))}
                      />
                    ) : (
                      <span className="font-num">{standards[t.id]?.[item.id] ?? 0}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
