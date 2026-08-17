const DB_NAME = 'amir-offline';
const DB_VERSION = 1;
const CACHE_STORE = 'cache';
const QUEUE_STORE = 'queue';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function txStore(store: string, mode: IDBTransactionMode) {
  return openDb().then((db) => db.transaction(store, mode).objectStore(store));
}

export async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const s = await txStore(store, 'readonly');
  return new Promise((resolve, reject) => {
    const req = s.get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  const s = await txStore(store, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(store: string, key: string): Promise<void> {
  const s = await txStore(store, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = s.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const s = await txStore(store, 'readonly');
  return new Promise((resolve, reject) => {
    const req = s.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export const OFFLINE_CACHE = CACHE_STORE;
export const OFFLINE_QUEUE = QUEUE_STORE;
