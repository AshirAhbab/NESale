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