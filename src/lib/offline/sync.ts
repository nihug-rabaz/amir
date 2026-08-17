import { OfflineCacheStore, OfflineQueueStore } from './store';
import type { OfflineMutation } from './types';

export interface SyncResult {
  synced: number;
  failed: OfflineMutation[];
}

async function replay(item: OfflineMutation): Promise<void> {
  const r = await fetch(item.url, {
    method: item.method,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: item.body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  await applyMutationSideEffects(item, j);
}

async function applyMutationSideEffects(item: OfflineMutation, response: Record<string, unknown>): Promise<void> {
  if (item.method === 'PUT' && item.url.includes('/inventory')) {
    const inv = response.inventory as Record<string, number> | undefined;
    if (inv) await OfflineCacheStore.write(item.url, { inventory: inv });
    return;
  }
  if (item.method === 'PUT' && item.url.match(/\/api\/facilities\/[^/]+$/)) {
    const facility = response.facility as { id?: string; fields?: unknown } | undefined;
    if (facility?.id) {
      await OfflineCacheStore.patchJson('/api/facilities', (cur) => ({
        ...cur,
        facilities: ((cur.facilities as Array<{ id: string }>) || []).map((f) =>
          f.id === facility.id ? { ...f, ...facility } : f,
        ),
      }));
    }
    return;
  }
  if (item.method === 'POST' && item.url === '/api/facilities') {
    await OfflineCacheStore.deleteKey('/api/facilities');
  }
}

export class OfflineSync {
  static async flush(): Promise<SyncResult> {
    const queue = await OfflineQueueStore.all();
    let synced = 0;
    const failed: OfflineMutation[] = [];
    for (const item of queue) {
      try {
        await replay(item);
        await OfflineQueueStore.remove(item.id);
        synced += 1;
      } catch {
        failed.push(item);
      }
    }
    return { synced, failed };
  }
}
