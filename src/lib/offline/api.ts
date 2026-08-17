import { OfflineCacheStore, OfflineQueueStore } from './store';
import type { OfflineFetchOptions, OfflineJsonResult } from './types';

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function cacheKeyFor(url: string, custom?: string): string {
  return custom || url;
}

async function queueMutation(url: string, init: RequestInit, label: string): Promise<void> {
  await OfflineQueueStore.enqueue({
    url,
    method: (init.method || 'POST').toUpperCase(),
    body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body ?? {}),
    label,
  });
  await patchLocalCaches(url, init);
}

async function patchLocalCaches(url: string, init: RequestInit): Promise<void> {
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
  if (init.method === 'PUT' && url.includes('/inventory') && body.inventory) {
    await OfflineCacheStore.write(url, { inventory: body.inventory });
    return;
  }
  if (init.method === 'PUT' && url.match(/\/api\/facilities\/[^/]+$/) && body.facility) {
    const id = url.split('/').pop();
    await OfflineCacheStore.patchJson('/api/facilities', (cur) => ({
      ...cur,
      facilities: ((cur.facilities as Array<{ id: string }>) || []).map((f) =>
        f.id === id ? { ...f, ...body.facility } : f,
      ),
    }));
  }
}

export async function offlineJson<T = Record<string, unknown>>(
  url: string,
  init: OfflineFetchOptions = {},
): Promise<OfflineJsonResult<T>> {
  const key = cacheKeyFor(url, init.cacheKey);
  const method = (init.method || 'GET').toUpperCase();
  const queueWhenOffline = init.queueWhenOffline !== false;
  const offlineLabel = init.offlineLabel || 'שינוי ממתין לסנכרון';

  if (method === 'GET') {
    if (isOnline()) {
      try {
        const r = await fetch(url, init);
        const data = await r.json() as T;
        if (r.ok) await OfflineCacheStore.write(key, data);
        if (!r.ok) throw new Error((data as { error?: string }).error || `HTTP ${r.status}`);
        return { data, fromCache: false, queued: false };
      } catch (e) {
        const cached = await OfflineCacheStore.read(key, init.cacheTtlMs);
        if (cached) return { data: cached as T, fromCache: true, queued: false };
        throw e;
      }
    }
    const cached = await OfflineCacheStore.read(key, init.cacheTtlMs);
    if (cached) return { data: cached as T, fromCache: true, queued: false };
    throw new Error('אין חיבור לרשת ואין נתונים שמורים מקומית');
  }

  if (isOnline()) {
    try {
      const r = await fetch(url, init);
      const data = await r.json() as T;
      if (!r.ok || (data as { error?: string }).error) {
        throw new Error((data as { error?: string }).error || `HTTP ${r.status}`);
      }
      if (method === 'GET') await OfflineCacheStore.write(key, data);
      else await patchLocalCaches(url, init);
      return { data, fromCache: false, queued: false };
    } catch (e) {
      if (!queueWhenOffline || !init.body) throw e;
      await queueMutation(url, init, offlineLabel);
      return { data: { ok: true, offline: true, queued: true } as T, fromCache: false, queued: true };
    }
  }

  if (!queueWhenOffline) throw new Error('אין חיבור לרשת');
  await queueMutation(url, init, offlineLabel);
  return { data: { ok: true, offline: true, queued: true } as T, fromCache: false, queued: true };
}

export function subscribeOnlineStatus(onChange: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onChange(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}
