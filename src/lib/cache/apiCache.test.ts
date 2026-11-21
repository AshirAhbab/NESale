import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ApiCache } from "./apiCache";

beforeEach(() => {
  ApiCache.clear();
});

afterEach(() => {
  ApiCache.clear();
});

describe("ApiCache.incrementCounter", () => {
  it("increments counter from 0 to 1 on first call", () => {
    const result = ApiCache.incrementCounter("test_key", 60000, 10);
    expect(result.count).toBe(1);
    expect(result.allowed).toBe(true);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("increments counter on subsequent calls within window", () => {
    ApiCache.incrementCounter("test_key", 60000, 10);
    const result = ApiCache.incrementCounter("test_key", 60000, 10);
    expect(result.count).toBe(2);
    expect(result.allowed).toBe(true);
  });

  it("denies when limit is reached", () => {
    ApiCache.incrementCounter("test_key", 60000, 2);
    ApiCache.incrementCounter("test_key", 60000, 2);
    const result = ApiCache.incrementCounter("test_key", 60000, 2);
    expect(result.count).toBe(3);
    expect(result.allowed).toBe(false);
  });

  it("resets counter after window expires", () => {
    ApiCache.incrementCounter("test_key", 50, 2); // 50ms window
    ApiCache.incrementCounter("test_key", 50, 2);

    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 60) {
      // busy wait
    }

    const result = ApiCache.incrementCounter("test_key", 50, 2);
    expect(result.count).toBe(1);
    expect(result.allowed).toBe(true);
  });

  it("different keys are independent", () => {
    ApiCache.incrementCounter("key_a", 60000, 5);
    ApiCache.incrementCounter("key_a", 60000, 5);
    const resultB = ApiCache.incrementCounter("key_b", 60000, 5);
    expect(resultB.count).toBe(1);
    expect(resultB.allowed).toBe(true);
  });
});

describe("ApiCache.getOrSet and Invalidation", () => {
  it("fetches on miss and returns cached data on hit", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return { value: "test_data" };
    };

    const first = await ApiCache.getOrSet("test_fetch", fetcher, 5000);
    expect(first).toEqual({ value: "test_data" });
    expect(callCount).toBe(1);

    const second = await ApiCache.getOrSet("test_fetch", fetcher, 5000);
    expect(second).toEqual({ value: "test_data" });
    expect(callCount).toBe(1); // Cached, fetcher not called again
  });

  it("invalidates keys matching pattern", async () => {
    let countA = 0;
    let countB = 0;

    await ApiCache.getOrSet("overview:biz_123:30d", async () => ++countA, 5000);
    await ApiCache.getOrSet("overview:biz_999:30d", async () => ++countB, 5000);

    expect(countA).toBe(1);
    expect(countB).toBe(1);

    // Invalidate biz_123 only
    ApiCache.invalidateBusiness("biz_123");

    await ApiCache.getOrSet("overview:biz_123:30d", async () => ++countA, 5000);
    await ApiCache.getOrSet("overview:biz_999:30d", async () => ++countB, 5000);

    expect(countA).toBe(2); // Re-fetched because invalidated
    expect(countB).toBe(1); // Still cached
  });

  it("constructs proper multi-tenant isolated keys", () => {
    const key = ApiCache.tenantKey("biz_abc", "analytics", "30d");
    expect(key).toBe("biz:biz_abc:analytics:30d");

    const rootKey = ApiCache.tenantKey("biz_abc", "settings");
    expect(rootKey).toBe("biz:biz_abc:settings");
  });
});