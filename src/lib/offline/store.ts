import { uid } from '@/lib/format';
import { OFFLINE_CACHE, OFFLINE_QUEUE, idbDelete, idbGet, idbGetAll, idbSet } from './db';
import type { CachedPayload, OfflineMutation } from './types';

const DEFAULT_TTL = 1000 * 60 * 60 * 24;

export class OfflineCacheStore {
  static async read(key: string, ttlMs = DEFAULT_TTL): Promise<unknown | null> {
    const hit = await idbGet<CachedPayload>(OFFLINE_CACHE, key);
    if (!hit) return null;
    if (Date.now() - hit.savedAt > ttlMs) return null;
    return hit.data;
  }

  static async write(key: string, data: unknown): Promise<void> {
    await idbSet(OFFLINE_CACHE, key, { data, savedAt: Date.now() } satisfies CachedPayload);
  }

  static async patchJson(key: string, patch: (current: Record<string, unknown>) => Record<string, unknown>): Promise<void> {
    const current = (await this.read(key, Number.MAX_SAFE_INTEGER)) as Record<string, unknown> | null;
    if (!current) return;
    await this.write(key, patch(current));
  }

  static async deleteKey(key: string): Promise<void> {
    await idbDelete(OFFLINE_CACHE, key);
  }
}

export class OfflineQueueStore {
  static async all(): Promise<OfflineMutation[]> {
    const rows = await idbGetAll<OfflineMutation>(OFFLINE_QUEUE);
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  }

  static async count(): Promise<number> {
    return (await this.all()).length;
  }

  static async enqueue(input: Omit<OfflineMutation, 'id' | 'createdAt'>): Promise<OfflineMutation> {
    const item: OfflineMutation = { ...input, id: uid('q'), createdAt: Date.now() };
    await idbSet(OFFLINE_QUEUE, item.id, item);
    return item;
  }

  static async remove(id: string): Promise<void> {
    await idbDelete(OFFLINE_QUEUE, id);
  }
}
