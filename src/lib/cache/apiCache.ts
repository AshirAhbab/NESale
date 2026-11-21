/**
 * Two-Tier Shared Cache Engine:
 * - Tier 1 (L1): Ultra-fast In-Memory SWR Cache (< 1ms latency, 0 network cost).
 * - Tier 2 (L2): Upstash Redis REST API (optional distributed shared cache with zero npm dependencies).
 * Seamlessly falls back to 100% zero-cost in-memory mode when Upstash environment variables are absent.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number;
}

// Global store survives Next.js development hot-reloads and Turbopack module re-evaluations
const globalKey = "__api_cache_store__" as const;
const memoryStore: Map<string, CacheEntry<unknown>> =
  (globalThis as unknown as { [key: string]: Map<string, CacheEntry<unknown>> })[globalKey] ??
  ((globalThis as unknown as { [key: string]: Map<string, CacheEntry<unknown>> })[globalKey] = new Map());

// Cache configuration constants
const DEFAULT_TTL_MS = 45 * 1000; // 45 seconds fresh
const STALE_GRACE_MS = 120 * 1000; // 2 minutes stale-while-revalidate

export class ApiCache {
  /**
   * Helper to construct strictly isolated multi-tenant cache keys
   */
  public static tenantKey(businessId: string, namespace: string, subKey?: string): string {
    return subKey
      ? `biz:${businessId}:${namespace}:${subKey}`
      : `biz:${businessId}:${namespace}`;
  }

  /**
   * Read from Upstash Redis REST API with low-timeout safety guard (Tier 2)
   */
  private static async getFromRedis<T>(key: string): Promise<T | null> {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!upstashUrl || !upstashToken) return null;

    try {
      const redisKey = `nesale:cache:${key}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 800); // 800ms circuit-breaker

      const res = await fetch(`${upstashUrl}/get/${encodeURIComponent(redisKey)}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) return null;
      const json = await res.json();
      if (json.result) {
        return JSON.parse(json.result) as T;
      }
    } catch {
      // Non-blocking: fail gracefully to L1 / database on any network issue
    }
    return null;
  }

  /**
   * Non-blocking write to Upstash Redis REST API (Tier 2)
   */
  private static setInRedis(key: string, value: unknown, ttlMs: number): void {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!upstashUrl || !upstashToken) return;

    const redisKey = `nesale:cache:${key}`;
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));

    fetch(`${upstashUrl}/set/${encodeURIComponent(redisKey)}?ex=${ttlSec}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(value),
    }).catch(() => {
      // Fire-and-forget: Redis write failures must never affect the user response
    });
  }

  /**
   * Non-blocking delete from Upstash Redis REST API (Tier 2)
   */
  private static deleteFromRedis(keys: string[]): void {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!upstashUrl || !upstashToken || keys.length === 0) return;

    const formattedKeys = keys.map((k) => `nesale:cache:${k}`);
    fetch(`${upstashUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedKeys.map((k) => ["DEL", k])),
    }).catch(() => {});
  }

  /**
   * Get cached data if valid, or execute the fetcher function and cache the result.
   * Checks L1 (Memory) -> L2 (Upstash Redis) -> Database Fetcher.
   */
  public static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS
  ): Promise<T> {
    const now = Date.now();
    const entry = memoryStore.get(key);

    // 1. L1 Fresh hit: Return immediately in < 1ms
    if (entry && now < entry.expiresAt) {
      return entry.data as T;
    }

    // 2. L1 Stale hit (SWR): Return stale immediately and trigger background refresh
    if (entry && now < entry.staleAt) {
      fetcher()
        .then((fresh) => {
          memoryStore.set(key, {
            data: fresh,
            expiresAt: Date.now() + ttlMs,
            staleAt: Date.now() + ttlMs + STALE_GRACE_MS,
          });
          ApiCache.setInRedis(key, fresh, ttlMs);
        })
        .catch(() => {});
      return entry.data as T;
    }

    // 3. L2 Redis Check (Distributed Tier)
    const redisData = await ApiCache.getFromRedis<T>(key);
    if (redisData !== null) {
      memoryStore.set(key, {
        data: redisData,
        expiresAt: now + ttlMs,
        staleAt: now + ttlMs + STALE_GRACE_MS,
      });
      return redisData;
    }

    // 4. Cache miss: Execute fetcher, store into L1 and L2, and return
    const fresh = await fetcher();
    memoryStore.set(key, {
      data: fresh,
      expiresAt: now + ttlMs,
      staleAt: now + ttlMs + STALE_GRACE_MS,
    });
    ApiCache.setInRedis(key, fresh, ttlMs);
    return fresh;
  }

  /**
   * Invalidate specific keys or keys matching a prefix/pattern
   */
  public static invalidate(pattern: string): void {
    const matchedKeys: string[] = [];
    for (const key of memoryStore.keys()) {
      if (key.includes(pattern)) {
        memoryStore.delete(key);
        matchedKeys.push(key);
      }
    }
    if (matchedKeys.length > 0) {
      ApiCache.deleteFromRedis(matchedKeys);
    } else {
      ApiCache.deleteFromRedis([pattern]);
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
   * Clear entire L1 cache
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
