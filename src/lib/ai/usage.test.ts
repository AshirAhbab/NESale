import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  recordAiUsage,
  checkBusinessUsageLimit,
  checkPlatformBudget,
  getBusinessUsageSummary,
} from "./usage";

const MOCK_BUSINESS_ID = "biz_test_123";
const MOCK_CONVERSATION_ID = "conv_test_456";

beforeEach(() => {
  vi.stubGlobal("fetch", undefined as any);
  vi.spyOn(prisma.usageRecord, "findFirst").mockResolvedValue(null as any);
  vi.spyOn(prisma.usageRecord, "create").mockResolvedValue({} as any);
  vi.spyOn(prisma.usageRecord, "aggregate").mockResolvedValue({ _sum: { quantity: null } } as any);
  vi.spyOn(prisma, "$transaction").mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) {
      const results = [];
      for (const call of arg) {
        results.push(await call);
      }
      return results;
    }
    return await arg(prisma);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordAiUsage", () => {
  it("creates usage records for successful request", async () => {
    const createSpy = vi.spyOn(prisma.usageRecord, "create");
    const transactionSpy = vi.spyOn(prisma, "$transaction");

    await recordAiUsage({
      businessId: MOCK_BUSINESS_ID,
      conversationId: MOCK_CONVERSATION_ID,
      model: "meta-llama/llama-3.2-3b-instruct:free",
      inputTokens: 50,
      outputTokens: 30,
      totalTokens: 80,
      durationMs: 250,
      success: true,
      fallbackUsed: false,
      requestId: "req_123",
    });

    expect(transactionSpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalled();
  });

  it("creates error record on failed request", async () => {
    const transactionSpy = vi.spyOn(prisma, "$transaction");

    await recordAiUsage({
      businessId: MOCK_BUSINESS_ID,
      model: "openrouter/free",
      durationMs: 100,
      success: false,
      fallbackUsed: false,
      requestId: "req_456",
      errorCode: "AI_PROVIDER_TIMEOUT",
    });

    expect(transactionSpy).toHaveBeenCalled();
  });

  it("records usage with requestId in metadata for idempotency tracking", async () => {
    const transactionSpy = vi.spyOn(prisma, "$transaction");

    await recordAiUsage({
      businessId: MOCK_BUSINESS_ID,
      model: "openrouter/free",
      durationMs: 100,
      success: true,
      fallbackUsed: false,
      requestId: "req_idempotent",
    });

    expect(transactionSpy).toHaveBeenCalled();
  });

  it("records tokens when provided", async () => {
    const transactionSpy = vi.spyOn(prisma, "$transaction");

    await recordAiUsage({
      businessId: MOCK_BUSINESS_ID,
      model: "openrouter/free",
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
      durationMs: 300,
      success: true,
      fallbackUsed: false,
      requestId: "req_tokens",
    });

    expect(transactionSpy).toHaveBeenCalled();
  });
});

describe("checkBusinessUsageLimit", () => {
  it("allows request when under limit", async () => {
    vi.spyOn(prisma.usageRecord, "aggregate").mockResolvedValue({
      _sum: { quantity: BigInt(10) },
    } as any);

    const result = await checkBusinessUsageLimit(MOCK_BUSINESS_ID);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(90);
    expect(result.limit).toBe(100);
  });

  it("denies request when at request limit", async () => {
    vi.spyOn(prisma.usageRecord, "aggregate").mockResolvedValue({
      _sum: { quantity: BigInt(100) },
    } as any);

    const result = await checkBusinessUsageLimit(MOCK_BUSINESS_ID);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain("Daily AI request limit");
  });

  it("denies request when at token limit", async () => {
    vi.spyOn(prisma.usageRecord, "aggregate")
      .mockResolvedValueOnce({ _sum: { quantity: BigInt(50) } } as any) // requests
      .mockResolvedValueOnce({ _sum: { quantity: BigInt(50000) } } as any); // tokens

    const result = await checkBusinessUsageLimit(MOCK_BUSINESS_ID);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Daily AI token limit");
  });
});

describe("checkPlatformBudget", () => {
  it("allows when under platform budget", async () => {
    vi.spyOn(prisma.usageRecord, "aggregate").mockResolvedValue({
      _sum: { quantity: BigInt(500) },
    } as any);

    const result = await checkPlatformBudget();
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(500);
    expect(result.limit).toBe(1000);
  });

  it("denies when platform budget exhausted", async () => {
    vi.spyOn(prisma.usageRecord, "aggregate").mockResolvedValue({
      _sum: { quantity: BigInt(1000) },
    } as any);

    const result = await checkPlatformBudget();
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain("Platform daily AI request budget");
  });
});

describe("getBusinessUsageSummary", () => {
  it("returns usage summary for business", async () => {
    vi.spyOn(prisma.usageRecord, "aggregate")
      .mockResolvedValueOnce({ _sum: { quantity: BigInt(25) } } as any) // requests
      .mockResolvedValueOnce({ _sum: { quantity: BigInt(5000) } } as any) // tokens
      .mockResolvedValueOnce({ _sum: { quantity: BigInt(2) } } as any); // errors

    const result = await getBusinessUsageSummary(MOCK_BUSINESS_ID);
    expect(result.requestsToday).toBe(25);
    expect(result.tokensToday).toBe(5000);
    expect(result.errorsToday).toBe(2);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(75);
  });
});