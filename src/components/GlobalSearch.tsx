'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { offlineJson } from '@/lib/offline/api';
import { filterFacilities } from '@/lib/permissions';
import type { Facility, InventoryItem } from '@/lib/types';
import { ITEM_CATEGORIES } from '@/lib/catalog';
import { IconBuilding, IconBoxes, IconSearch, IconUsers, IconX } from './Icon';

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

// Global header search across facilities, units and items — desktop + mobile.
export function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  function ensureData() {
    if (loaded) return;
    setLoaded(true);
    Promise.all([
      offlineJson<{ facilities?: Facility[] }>('/api/facilities').catch(() => ({ data: {} as { facilities?: Facility[] }, fromCache: false, queued: false })),
      offlineJson<{ items?: InventoryItem[] }>('/api/standards').catch(() => ({ data: {} as { items?: InventoryItem[] }, fromCache: false, queued: false })),
    ]).then(([f, s]) => {
      setFacilities(f.data.facilities || []);
      setItems(s.data.items || []);
    });
  }

  const scopedFacilities = useMemo(() => filterFacilities(user, facilities), [user, facilities]);

  const units = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of scopedFacilities) {
      for (const [field, level] of UNIT_LEVELS) {
        const v = (f[field] as string | null) || '';
        if (v && v !== '—' && !map.has(v)) map.set(v, level);
      }
    }
    return Array.from(map, ([name, level]) => ({ name, level }));
  }, [scopedFacilities]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const has = (s: string | null | undefined) => String(s ?? '').toLowerCase().includes(q);

    const fac: SearchResult[] = scopedFacilities
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
  }, [query, scopedFacilities, units, items]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    ensureData();
    const t = setTimeout(() => mobileInputRef.current?.focus(), 50);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
    setQuery('');
    setOpen(false);
  }

  function go(r: SearchResult) {
    setOpen(false);
    setMobileOpen(false);
    setQuery('');
    router.push(r.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      if (mobileOpen) closeMobile();
      else setOpen(false);
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  }

  function renderResults(fullWidth: boolean) {
    let lastType: ResultType | null = null;
    if (!query.trim()) {
      return (
        <div className="px-4 py-8 text-center text-sm text-slate-500">
          הקלד שם מתקן, יחידה או פריט לחיפוש
        </div>
      );
    }
    if (results.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-sm text-slate-500">לא נמצאו תוצאות עבור “{query}”</div>
      );
    }
    return results.map((r, i) => {
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
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-right ${i === active ? 'bg-primary-50' : 'hover:bg-slate-50'} ${fullWidth ? 'py-3' : ''}`}
          >
            <meta.Icon size={16} className="text-slate-400 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-slate-800 truncate">{r.label}</span>
              {r.sub && <span className="block text-[11px] text-slate-500 truncate">{r.sub}</span>}
            </span>
          </button>
        </div>
      );
    });
  }

  return (
    <>
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
            {renderResults(false)}
          </div>
        )}
      </div>

      <button
        type="button"
        className="md:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-slate-100 active:bg-slate-200 text-slate-700 shrink-0"
        aria-label="חיפוש"
        onClick={() => setMobileOpen(true)}
      >
        <IconSearch size={20} />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-white animate-fade-in" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-2 px-3 h-14 border-b border-slate-200 shrink-0">
            <div className="relative flex-1 min-w-0">
              <input
                ref={mobileInputRef}
                type="search"
                value={query}
                placeholder="חיפוש מתקנים, יחידות, פריטים..."
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onKeyDown={onKeyDown}
                className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15 outline-none text-[15px]"
              />
              <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <button
              type="button"
              onClick={closeMobile}
              className="h-10 w-10 grid place-items-center rounded-xl hover:bg-slate-100 text-slate-700 shrink-0"
              aria-label="סגור חיפוש"
            >
              <IconX size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin overscroll-contain">
            {renderResults(true)}
          </div>
        </div>
      )}
    </>
  );
}
