export interface CachedPayload {
  data: unknown;
  savedAt: number;
}

export interface OfflineMutation {
  id: string;
  url: string;
  method: string;
  body: string;
  label: string;
  createdAt: number;
}

export interface OfflineFetchOptions extends RequestInit {
  cacheKey?: string;
  cacheTtlMs?: number;
  offlineLabel?: string;
  queueWhenOffline?: boolean;
}

export interface OfflineJsonResult<T> {
  data: T;
  fromCache: boolean;
  queued: boolean;
}
