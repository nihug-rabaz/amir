'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch, IconX } from './Icon';

export interface SearchOption {
  value: string;
  label: string;
  sub?: string;
}

interface Props {
  options: SearchOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
}

// Text combobox: shows all options and filters them by free-text typed in the input.
export function SearchSelect({ options, value, onChange, placeholder = 'חיפוש...', emptyText = 'לא נמצאו תוצאות' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => options.find((o) => o.value === value)?.label ?? '', [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub || '').toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function choose(opt: SearchOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && filtered[highlight]) choose(filtered[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  }

  return (
    <div ref={boxRef} className="relative mt-1">
      <input
        type="text"
        className="input pr-9"
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => { setOpen(true); setQuery(''); setHighlight(0); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {value && !open ? (
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(''); }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="נקה בחירה"
        >
          <IconX size={16} />
        </button>
      ) : (
        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
      )}

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto scrollbar-thin bg-white border border-slate-200 rounded-lg shadow-card">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-400 text-center">{emptyText}</div>
          ) : filtered.map((o, i) => (
            <button
              type="button"
              key={o.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-right px-3 py-2 text-sm border-b border-slate-50 last:border-0 transition ${
                i === highlight ? 'bg-primary/5' : 'hover:bg-slate-50'
              } ${o.value === value ? 'font-bold text-primary' : ''}`}
            >
              <span>{o.label}</span>
              {o.sub && <span className="text-slate-400 text-xs"> · {o.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
