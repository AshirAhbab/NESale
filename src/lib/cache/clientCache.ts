/**
 * Client-side SWR (Stale-While-Revalidate) cache for instant dashboard navigation.
 * Keeps data in memory so tab switching and page revisits are instant.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
}

const CLIENT_CACHE_TTL_MS = 30 * 1000; // 30 seconds fresh
const CLIENT_CACHE_STALE_MS = 60 * 1000; // 1 minute stale

const memoryStore = new Map<string, CacheEntry<unknown>>();

export class ClientCache {
  static get<T>(key: string): T | null {
    const entry = memoryStore.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      memoryStore.delete(key);
      return null;
    }

    return entry.data as T;
  }

  static set<T>(key: string, data: T, ttlMs: number = CLIENT_CACHE_TTL_MS): void {
    const now = Date.now();
    memoryStore.set(key, {
      data,
      expiresAt: now + ttlMs,
      staleAt: now + CLIENT_CACHE_STALE_MS,
    });
  }

  static invalidate(pattern: string): void {
    for (const key of memoryStore.keys()) {
      if (key.includes(pattern)) {
        memoryStore.delete(key);
      }
    }
  }

  static invalidateAll(): void {
    memoryStore.clear();
  }

  static has(key: string): boolean {
    const entry = memoryStore.get(key);
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }
}

export const clientCache = ClientCache;

/**
 * SWR fetch helper: returns cached data immediately if available,
 * then fetches fresh data in the background.
 */
export async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; staleMs?: number } = {}
): Promise<T> {
  const cached = clientCache.get<T>(key);
  if (cached !== null) {
    // Return stale data immediately, refresh in background
    fetcher()
      .then((fresh) => {
        clientCache.set(key, fresh, options.ttlMs);
      })
      .catch(() => {});
    return cached;
  }

  // Cache miss: fetch and cache
  const fresh = await fetcher();
  clientCache.set(key, fresh, options.ttlMs);
  return fresh;
}
