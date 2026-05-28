export function fmtNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  return Number(n).toLocaleString('he-IL');
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0%';
  return `${Math.round(n)}%`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}
