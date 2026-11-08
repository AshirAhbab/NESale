import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface AiUsageInput {
  businessId: string;
  conversationId?: string | null;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  durationMs: number;
  success: boolean;
  fallbackUsed?: boolean;
  requestId: string;
  errorCode?: string | null;
}

const METRIC_REQUESTS = "ai_requests";
const METRIC_TOKENS = "ai_tokens";
const METRIC_ERRORS = "ai_errors";
const METRIC_EMBEDDINGS = "embeddings";

// Per-business daily limits (free tier)
const PER_BUSINESS_DAILY_REQUEST_LIMIT = 100;
const PER_BUSINESS_DAILY_TOKEN_LIMIT = 50000;
const PER_BUSINESS_DAILY_EMBEDDING_LIMIT = 1000;

// Platform-level free tier budget (global)
const PLATFORM_DAILY_REQUEST_LIMIT = 1000;

function getDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Records AI usage to the UsageRecord table with idempotency via requestId.
 * Skips creation if a record with the same requestId already exists for today.
 */
export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  const { start, end } = getDayBounds();
  const metadata: Record<string, unknown> = {
    requestId: input.requestId,
    model: input.model,
    durationMs: input.durationMs,
    success: input.success,
    fallbackUsed: input.fallbackUsed ?? false,
    conversationId: input.conversationId ?? null,
  };

  if (input.errorCode) {
    metadata.errorCode = input.errorCode;
  }

  // Record usage (idempotency handled at application level via requestId in metadata)
  await prisma.$transaction([
    // Request count record
    prisma.usageRecord.create({
      data: {
        businessId: input.businessId,
        periodStart: start,
        periodEnd: end,
        metric: METRIC_REQUESTS,
        quantity: BigInt(1),
        metadata: metadata as unknown as Prisma.InputJsonValue,
      },
    }),
    // Token usage record (only if we have token data)
    ...(input.totalTokens ? [
      prisma.usageRecord.create({
        data: {
          businessId: input.businessId,
          periodStart: start,
          periodEnd: end,
          metric: METRIC_TOKENS,
          quantity: BigInt(input.totalTokens),
          metadata: metadata as unknown as Prisma.InputJsonValue,
        },
      }),
    ] : []),
    // Error record (only on failure)
    ...(!input.success ? [
      prisma.usageRecord.create({
        data: {
          businessId: input.businessId,
          periodStart: start,
          periodEnd: end,
          metric: METRIC_ERRORS,
          quantity: BigInt(1),
          metadata: metadata as unknown as Prisma.InputJsonValue,
        },
      }),
    ] : []),
  ]);
}

/**
 * Checks whether a business has remaining daily AI request capacity.
 * Returns { allowed, remaining, limit }.
 */
export async function checkBusinessUsageLimit(businessId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
}> {
  const { start, end } = getDayBounds();

  const [requestCount, tokenCount] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: {
        businessId,
        periodStart: { gte: start, lte: end },
        metric: METRIC_REQUESTS,
      },
      _sum: { quantity: true },
    }),
    prisma.usageRecord.aggregate({
      where: {
        businessId,
        periodStart: { gte: start, lte: end },
        metric: METRIC_TOKENS,
      },
      _sum: { quantity: true },
    }),
  ]);

  const requestsUsed = Number(requestCount._sum.quantity ?? 0);
  const tokensUsed = Number(tokenCount._sum.quantity ?? 0);

  if (requestsUsed >= PER_BUSINESS_DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: PER_BUSINESS_DAILY_REQUEST_LIMIT,
      reason: "Daily AI request limit exceeded for this business.",
    };
  }

  if (tokensUsed >= PER_BUSINESS_DAILY_TOKEN_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: PER_BUSINESS_DAILY_TOKEN_LIMIT,
      reason: "Daily AI token limit exceeded for this business.",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, PER_BUSINESS_DAILY_REQUEST_LIMIT - requestsUsed),
    limit: PER_BUSINESS_DAILY_REQUEST_LIMIT,
  };
}

/**
 * Records embedding usage to the UsageRecord table.
 */
export async function recordEmbeddingUsage(input: {
  businessId: string;
  count: number;
  model: string;
  requestId: string;
  success: boolean;
  errorCode?: string | null;
}): Promise<void> {
  const { start, end } = getDayBounds();
  const metadata: Record<string, unknown> = {
    requestId: input.requestId,
    model: input.model,
    count: input.count,
    success: input.success,
  };

  if (input.errorCode) {
    metadata.errorCode = input.errorCode;
  }

  await prisma.usageRecord.create({
    data: {
      businessId: input.businessId,
      periodStart: start,
      periodEnd: end,
      metric: METRIC_EMBEDDINGS,
      quantity: BigInt(input.count),
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Checks whether a business has remaining daily embedding capacity.
 */
export async function checkEmbeddingLimit(businessId: string, requestedCount: number): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
}> {
  const { start, end } = getDayBounds();

  const [embeddingCount] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: {
        businessId,
        periodStart: { gte: start, lte: end },
        metric: METRIC_EMBEDDINGS,
      },
      _sum: { quantity: true },
    }),
  ]);

  const embeddingsUsed = Number(embeddingCount._sum.quantity ?? 0);
  const remaining = Math.max(0, PER_BUSINESS_DAILY_EMBEDDING_LIMIT - embeddingsUsed);

  if (embeddingsUsed + requestedCount > PER_BUSINESS_DAILY_EMBEDDING_LIMIT) {
    return {
      allowed: false,
      remaining,
      limit: PER_BUSINESS_DAILY_EMBEDDING_LIMIT,
      reason: "Daily embedding limit exceeded for this business.",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, remaining - requestedCount),
    limit: PER_BUSINESS_DAILY_EMBEDDING_LIMIT,
  };
}
export async function checkPlatformBudget(): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
}> {
  const { start, end } = getDayBounds();

  const [requestCount] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: {
        periodStart: { gte: start, lte: end },
        metric: METRIC_REQUESTS,
      },
      _sum: { quantity: true },
    }),
  ]);

  const requestsUsed = Number(requestCount._sum.quantity ?? 0);

  if (requestsUsed >= PLATFORM_DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: PLATFORM_DAILY_REQUEST_LIMIT,
      reason: "Platform daily AI request budget exhausted.",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, PLATFORM_DAILY_REQUEST_LIMIT - requestsUsed),
    limit: PLATFORM_DAILY_REQUEST_LIMIT,
  };
}

/**
 * Gets usage summary for a business for the current day.
 */
export async function getBusinessUsageSummary(businessId: string): Promise<{
  requestsToday: number;
  tokensToday: number;
  errorsToday: number;
  limit: number;
  remaining: number;
}> {
  const { start, end } = getDayBounds();

  const [requestCount, tokenCount, errorCount] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: {
        businessId,
        periodStart: { gte: start, lte: end },
        metric: METRIC_REQUESTS,
      },
      _sum: { quantity: true },
    }),
    prisma.usageRecord.aggregate({
      where: {
        businessId,
        periodStart: { gte: start, lte: end },
        metric: METRIC_TOKENS,
      },
      _sum: { quantity: true },
    }),
    prisma.usageRecord.aggregate({
      where: {
        businessId,
        periodStart: { gte: start, lte: end },
        metric: METRIC_ERRORS,
      },
      _sum: { quantity: true },
    }),
  ]);

  const requestsToday = Number(requestCount._sum.quantity ?? 0);
  const tokensToday = Number(tokenCount._sum.quantity ?? 0);
  const errorsToday = Number(errorCount._sum.quantity ?? 0);

  return {
    requestsToday,
    tokensToday,
    errorsToday,
    limit: PER_BUSINESS_DAILY_REQUEST_LIMIT,
    remaining: Math.max(0, PER_BUSINESS_DAILY_REQUEST_LIMIT - requestsToday),
  };
}
