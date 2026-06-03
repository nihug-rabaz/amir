'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Facility, InventoryItem } from '@/lib/types';
import { ITEM_CATEGORIES } from '@/lib/catalog';
import { IconBuilding, IconBoxes, IconSearch, IconUsers } from './Icon';

type ResultType = 'facility' | 'unit' | 'item';

interface SearchResult {
  type: ResultType;
  key: string;
  label: string;
  sub: string;
  href: string;
}

const TYPE_META: Record<ResultType, { label: string; Icon: typeof IconBuilding }> = {
  facility: { label: 'מתקנים', Icon: IconBuilding },
  unit: { label: 'יחידות', Icon: IconUsers },
  item: { label: 'פריטים', Icon: IconBoxes },
};

const UNIT_LEVELS: Array<[keyof Facility, string]> = [
  ['command', 'פיקוד'],
  ['division', 'אוגדה'],
  ['brigade', 'חטיבה'],
  ['battalion', 'גדוד'],
];

// Global header search across facilities, units (hierarchy) and equipment items.
export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  function ensureData() {
    if (loaded) return;
    setLoaded(true);
    Promise.all([
      fetch('/api/facilities').then((r) => r.json()).catch(() => ({})),
      fetch('/api/standards').then((r) => r.json()).catch(() => ({})),
    ]).then(([f, s]) => {
      setFacilities(f.facilities || []);
      setItems(s.items || []);
    });
  }

  const units = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of facilities) {
      for (const [field, level] of UNIT_LEVELS) {
        const v = (f[field] as string | null) || '';
        if (v && v !== '—' && !map.has(v)) map.set(v, level);
      }
    }
    return Array.from(map, ([name, level]) => ({ name, level }));
  }, [facilities]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const has = (s: string | null | undefined) => String(s ?? '').toLowerCase().includes(q);

    const fac: SearchResult[] = facilities
      .filter((f) => has(f.name) || has(f.command) || has(f.division) || has(f.brigade) || has(f.battalion))
      .slice(0, 6)
      .map((f) => ({
        type: 'facility', key: `f-${f.id}`, label: f.name,
        sub: [f.command, f.division, f.brigade].filter((x) => x && x !== '—').join(' · '),
        href: `/facilities/${f.id}`,
      }));

    const uni: SearchResult[] = units
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((u) => ({
        type: 'unit', key: `u-${u.level}-${u.name}`, label: u.name, sub: u.level,
        href: `/facilities?q=${encodeURIComponent(u.name)}`,
      }));

    const itm: SearchResult[] = items
      .filter((i) => has(i.name))
      .slice(0, 5)
      .map((i) => ({
        type: 'item', key: `i-${i.id}`, label: i.name,
        sub: ITEM_CATEGORIES[i.category] || i.category,
        href: `/standards?q=${encodeURIComponent(i.name)}`,
      }));

    return [...fac, ...uni, ...itm];
  }, [query, facilities, units, items]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(r: SearchResult) {
    setOpen(false);
    setQuery('');
    router.push(r.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  }

  let lastType: ResultType | null = null;

  return (
    <div ref={boxRef} className="relative w-[320px] max-w-[35vw] hidden md:block">
      <input
        type="search"
        value={query}
        placeholder="חיפוש מתקנים, יחידות, פריטים..."
        onFocus={() => { ensureData(); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        className="w-full pr-10 pl-3.5 py-2 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15 outline-none transition"
      />
      <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />

      {open && query.trim() && (
        <div className="absolute top-full mt-2 right-0 left-0 bg-white border border-slate-200 rounded-xl shadow-soft overflow-hidden z-30 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">לא נמצאו תוצאות עבור “{query}”</div>
          ) : (
            results.map((r, i) => {
              const meta = TYPE_META[r.type];
              const showHeader = r.type !== lastType;
              lastType = r.type;
              return (
                <div key={r.key}>
                  {showHeader && (
                    <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold text-slate-400 bg-slate-50/60">{meta.label}</div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-right ${i === active ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                  >
                    <meta.Icon size={16} className="text-slate-400 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-slate-800 truncate">{r.label}</span>
                      {r.sub && <span className="block text-[11px] text-slate-500 truncate">{r.sub}</span>}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
