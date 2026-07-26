type CacheEntry = { at: number; body: string };

const store = new Map<string, CacheEntry>();

export class FacilitiesListCache {
  static get(key: string, maxAgeMs: number): string | null {
    const hit = store.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at >= maxAgeMs) {
      store.delete(key);
      return null;
    }
    return hit.body;
  }

  static set(key: string, body: string) {
    store.set(key, { at: Date.now(), body });
  }

  static clear() {
    store.clear();
  }
}
