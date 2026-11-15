/**
 * Universal Distributed Rate Limiter
 * Supports Upstash Redis REST API (zero npm dependencies) with seamless in-memory fallback.
 * Works 100% on Vercel Serverless Free and local dev environments.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec?: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// In-memory periodic cleanup every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 60 * 1000).unref?.();
}

export class RateLimiter {
  /**
   * Evaluates rate limiting for an identifier within a rolling time window.
   */
  async check(
    key: string,
    limit: number = 30,
    windowSec: number = 60
  ): Promise<RateLimitResult> {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // 1. Try Upstash Redis if configured (e.g. production Vercel + Upstash Free)
    if (upstashUrl && upstashToken) {
      try {
        const redisKey = `ratelimit:${key}`;
        const res = await fetch(`${upstashUrl}/pipeline`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${upstashToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            ["INCR", redisKey],
            ["EXPIRE", redisKey, windowSec, "NX"],
            ["TTL", redisKey],
          ]),
          signal: AbortSignal.timeout(1500),
        });

        if (res.ok) {
          const data = (await res.json()) as Array<{ result: number }>;
          const count = Number(data[0]?.result) || 1;
          const ttlSec = Number(data[2]?.result) || windowSec;
          const resetAt = Date.now() + ttlSec * 1000;
          const remaining = Math.max(0, limit - count);
          const allowed = count <= limit;

          return {
            allowed,
            limit,
            remaining,
            resetAt,
            retryAfterSec: allowed ? undefined : Math.ceil(ttlSec),
          };
        }
      } catch (err) {
        console.warn("[RateLimiter] Upstash Redis call failed, falling back to memory:", err);
      }
    }

    // 2. High-performance in-memory fallback
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const existing = memoryStore.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + windowMs;
      memoryStore.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetAt,
      };
    }

    existing.count += 1;
    const allowed = existing.count <= limit;
    const remaining = Math.max(0, limit - existing.count);
    const retryAfterSec = allowed ? undefined : Math.ceil((existing.resetAt - now) / 1000);

    return {
      allowed,
      limit,
      remaining,
      resetAt: existing.resetAt,
      retryAfterSec,
    };
  }

  /**
   * Rate limit preset for AI widget chat
   */
  async limitChat(identifier: string) {
    return this.check(`chat:${identifier}`, 30, 60);
  }

  /**
   * Rate limit preset for lead capture submissions
   */
  async limitLead(identifier: string) {
    return this.check(`lead:${identifier}`, 5, 60);
  }

  /**
   * Rate limit preset for appointment booking
   */
  async limitBooking(identifier: string) {
    return this.check(`booking:${identifier}`, 5, 60);
  }

  /**
   * Generates standard HTTP rate limit headers
   */
  formatHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    };
    if (result.retryAfterSec !== undefined) {
      headers["Retry-After"] = String(result.retryAfterSec);
    }
    return headers;
  }
}

export const rateLimiter = new RateLimiter();
