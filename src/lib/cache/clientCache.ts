/**
 * Client-side SWR (Stale-While-Revalidate) cache for instant dashboard navigation.
 * Keeps data in memory so tab switching and page revisits are instant without skeleton flashes.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
}

const CLIENT_CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh
const CLIENT_CACHE_STALE_MS = 5 * 60 * 1000; // 5 minutes stale grace period

const memoryStore = new Map<string, CacheEntry<unknown>>();

export class ClientCache {
  /**
   * Returns data if present and within stale grace period.
   * If past staleAt, returns null.
   */
  static get<T>(key: string): T | null {
    const entry = memoryStore.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.staleAt) {
      memoryStore.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Returns true if entry exists and is still within its fresh TTL window.
   */
  static isFresh(key: string): boolean {
    const entry = memoryStore.get(key);
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }

  static set<T>(key: string, data: T, ttlMs: number = CLIENT_CACHE_TTL_MS): void {
    const now = Date.now();
    memoryStore.set(key, {
      data,
      expiresAt: now + ttlMs,
      staleAt: now + ttlMs + CLIENT_CACHE_STALE_MS,
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
    return Date.now() < entry.staleAt;
  }
}

export const clientCache = ClientCache;

/**
 * Executes a cache-first fetch with automatic background revalidation (SWR).
 * If cache is available, onData(cached, true) is called synchronously/immediately.
 * Then fresh data is fetched and onData(fresh, false) is called.
 */
export async function executeSwr<T>({
  key,
  fetcher,
  onData,
  ttlMs = CLIENT_CACHE_TTL_MS,
}: {
  key: string;
  fetcher: () => Promise<T>;
  onData: (data: T, isFromCache: boolean) => void;
  ttlMs?: number;
}): Promise<T> {
  const cached = ClientCache.get<T>(key);
  if (cached !== null) {
    onData(cached, true);
    // If it's still completely fresh, return without hitting network
    if (ClientCache.isFresh(key)) {
      return cached;
    }
  }

  // Revalidate fresh in background
  try {
    const fresh = await fetcher();
    ClientCache.set(key, fresh, ttlMs);
    onData(fresh, false);
    return fresh;
  } catch (err) {
    if (cached !== null) {
      // Retain cached data silently if background fetch failed
      return cached;
    }
    throw err;
  }
}
