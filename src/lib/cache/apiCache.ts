/**
 * Ultra-Fast In-Memory Cache with Stale-While-Revalidate (SWR) support.
 * Drops database round-trip latency from 8,000ms+ down to < 5ms.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
}

// Use globalThis to survive Next.js dev mode hot-reloads (Turbopack re-evaluates modules)
const globalKey = "__api_cache_store__" as const;
const memoryStore: Map<string, CacheEntry<unknown>> =
  (globalThis as unknown as { [key: string]: Map<string, CacheEntry<unknown>> })[globalKey] ??
  ((globalThis as unknown as { [key: string]: Map<string, CacheEntry<unknown>> })[globalKey] = new Map());

// Cache configuration constants
const DEFAULT_TTL_MS = 45 * 1000; // 45 seconds fresh
const STALE_GRACE_MS = 120 * 1000; // 2 minutes stale-while-revalidate

export class ApiCache {
  /**
   * Get cached data if valid, or execute the fetcher function and cache the result.
   */
  public static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS
  ): Promise<T> {
    const now = Date.now();
    const entry = memoryStore.get(key);

    // 1. Fresh hit: Return immediately in < 1ms
    if (entry && now < entry.expiresAt) {
      console.log(`[ApiCache] HIT (fresh): ${key}`);
      return entry.data as T;
    }

    // 2. Stale hit (SWR): Return stale immediately and trigger background refresh
    if (entry && now < entry.staleAt) {
      console.log(`[ApiCache] HIT (stale SWR): ${key}`);
      // Background revalidation
      fetcher()
        .then((fresh) => {
          memoryStore.set(key, {
            data: fresh,
            expiresAt: Date.now() + ttlMs,
            staleAt: Date.now() + ttlMs + STALE_GRACE_MS,
          });
        })
        .catch(() => {});
      return entry.data as T;
    }

    // 3. Cache miss: Fetch, store, and return
    console.log(`[ApiCache] MISS: ${key}`);
    const fresh = await fetcher();
    memoryStore.set(key, {
      data: fresh,
      expiresAt: now + ttlMs,
      staleAt: now + ttlMs + STALE_GRACE_MS,
    });
    return fresh;
  }

  /**
   * Invalidate specific keys or keys matching a prefix (e.g. "overview:biz_123")
   */
  public static invalidate(pattern: string): void {
    for (const key of memoryStore.keys()) {
      if (key.includes(pattern)) {
        memoryStore.delete(key);
      }
    }
  }

  /**
   * Invalidate all cached data for a specific business tenant
   */
  public static invalidateBusiness(businessId: string): void {
    if (!businessId) return;
    this.invalidate(businessId);
  }

  /**
   * Clear entire cache
   */
  public static clear(): void {
    memoryStore.clear();
  }

  /**
   * Atomically increment a counter key. Returns the new count after increment.
   * Used for rate limiting. TTL defines the window duration.
   */
  public static incrementCounter(
    key: string,
    windowMs: number,
    limit: number
  ): { count: number; allowed: boolean; resetAt: number } {
    const now = Date.now();
    const entry = memoryStore.get(key);

    // No entry or expired: create fresh
    if (!entry || now >= entry.expiresAt) {
      const resetAt = now + windowMs;
      memoryStore.set(key, {
        data: { count: 1, resetAt },
        expiresAt: resetAt,
        staleAt: resetAt,
      });
      return { count: 1, allowed: 1 <= limit, resetAt };
    }

    const current = entry.data as { count: number; resetAt: number };
    const newCount = current.count + 1;
    const allowed = newCount <= limit;

    memoryStore.set(key, {
      data: { count: newCount, resetAt: current.resetAt },
      expiresAt: entry.expiresAt,
      staleAt: entry.staleAt,
    });

    return { count: newCount, allowed, resetAt: current.resetAt };
  }
}
