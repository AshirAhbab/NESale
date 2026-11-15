import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "./rateLimiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it("permits requests within the defined threshold", async () => {
    const res = await limiter.check("test-user-1", 5, 60);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
  });

  it("blocks requests once the threshold is exceeded", async () => {
    const key = `test-user-limit-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      const res = await limiter.check(key, 3, 60);
      expect(res.allowed).toBe(true);
    }

    const blocked = await limiter.check(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("formats standard HTTP rate limit headers", async () => {
    const res = await limiter.check("test-headers", 10, 60);
    const headers = limiter.formatHeaders(res);
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("9");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });
});
