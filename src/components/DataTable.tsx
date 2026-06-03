'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { IconSearch } from './Icon';

export interface DataColumn<T> {
  key: string;
  label: string;
  width?: string;
  center?: boolean;
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  sortValue?: (row: T) => string | number;
  cellClass?: string;
}

export interface DataFilter {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface DataTableProps<T extends { id: string }> {
  rows: T[];
  columns: DataColumn<T>[];
  searchableFields?: (keyof T)[];
  filters?: DataFilter[];
  paginate?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  rowClass?: (row: T) => string;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  toolbarExtra?: ReactNode;
  initialSearch?: string;
}

export function DataTable<T extends { id: string }>(props: DataTableProps<T>) {
  const { rows, columns, searchableFields = [], filters = [], paginate = false, pageSize = 25, onRowClick, rowClass, defaultSort, toolbarExtra, initialSearch } = props;
  const [search, setSearch] = useState(initialSearch ?? '');
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSort?.dir ?? 'asc');
  const [page, setPage] = useState(1);

  const visible = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q && searchableFields.length) {
      list = list.filter((r) =>
        searchableFields.some((f) => String((r as Record<string, unknown>)[f as string] ?? '').toLowerCase().includes(q)),
      );
    }
    for (const f of filters) {
      const v = filterState[f.key];
      if (v && v !== '__all__') {
        list = list.filter((r) => String((r as Record<string, unknown>)[f.key]) === v);
      }
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      const dir = sortDir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const va = col?.sortValue ? col.sortValue(a) : (a as Record<string, unknown>)[sortKey];
        const vb = col?.sortValue ? col.sortValue(b) : (b as Record<string, unknown>)[sortKey];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), 'he') * dir;
      });
    }
    return list;
  }, [rows, search, filterState, sortKey, sortDir, columns, filters, searchableFields]);

  const totalPages = paginate ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1;
  const pageRows = paginate ? visible.slice((page - 1) * pageSize, page * pageSize) : visible;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-soft overflow-hidden">
      {(searchableFields.length > 0 || filters.length > 0 || toolbarExtra) && (
        <div className="flex flex-wrap items-center gap-2.5 p-3.5 border-b border-slate-200 bg-slate-50">
          {searchableFields.length > 0 && (
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="search"
                placeholder="חיפוש..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15"
              />
              <IconSearch className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          )}
          {filters.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">{f.label}:</label>
              <select
                value={filterState[f.key] || '__all__'}
                onChange={(e) => { setFilterState((s) => ({ ...s, [f.key]: e.target.value })); setPage(1); }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white min-w-[120px]"
              >
                <option value="__all__">הכל</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div className="flex-1" />
          {toolbarExtra}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.center ? 'center' : undefined, cursor: col.sortable === false ? undefined : 'pointer' }}
                  onClick={() => {
                    if (col.sortable === false) return;
                    if (sortKey === col.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    else { setSortKey(col.key); setSortDir('asc'); }
                  }}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <span className="text-slate-400 mr-1 text-[10px]">
                      {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-10 text-slate-500">
                <div className="text-3xl opacity-40 mb-2">⌕</div>
                <div className="font-bold text-slate-900">אין רשומות להצגה</div>
                <div className="text-xs mt-1">נסה לשנות סינון או חיפוש</div>
              </td></tr>
            ) : pageRows.map((row, i) => {
              const rowIndex = paginate ? (page - 1) * pageSize + i : i;
              return (
              <tr
                key={row.id}
                className={`${onRowClick ? 'clickable' : ''} ${rowClass ? rowClass(row) : ''}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button, a, input, select')) return;
                  onRowClick?.(row);
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={col.cellClass}
                    style={{ textAlign: col.center ? 'center' : undefined }}
                  >
                    {col.render ? col.render(row, rowIndex) : (row as Record<string, unknown>)[col.key] as ReactNode ?? '—'}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginate && (
        <div className="flex items-center justify-between p-3.5 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">סה״כ {visible.length} רשומות · עמוד {page} מתוך {totalPages}</div>
          <div className="flex gap-1.5">
            <button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ הקודם</button>
            <button className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>הבא ›</button>
          </div>
        </div>
      )}
    </div>
  );
}
