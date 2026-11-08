import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { embeddingProvider } from "@/lib/ai/embedding";
import { textChunker } from "@/lib/ai/chunker";
import { ApiCache } from "@/lib/cache/apiCache";
import { WebsiteCrawler } from "@/lib/ingestion/crawler";
import { ContentExtractor } from "@/lib/ingestion/extractor";
import { recordEmbeddingUsage } from "@/lib/ai/usage";
import { createHash } from "crypto";

export type JobType = "knowledge_sync" | "embedding" | "crawl";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface JobInput {
  businessId: string;
  type: JobType;
  payload?: Record<string, unknown>;
}

interface PrismaJob {
  id: string;
  businessId: string;
  type: string;
  status: string;
  payload: Record<string, unknown> | null;
  progress: number;
  maxProgress: number;
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Enqueue a background job. Returns the job ID immediately.
 * Kicks off asynchronous processing in the background.
 */
export async function enqueueJob(input: JobInput): Promise<string> {
  const job = await prisma.job.create({
    data: {
      businessId: input.businessId,
      type: input.type,
      status: "pending",
      payload: (input.payload ?? {}) as unknown as Prisma.InputJsonValue,
      progress: 0,
      maxProgress: 100,
    },
  });

  // Invalidate any cached job lists for this business
  ApiCache.invalidate(`jobs:${input.businessId}`);

  // Trigger non-blocking asynchronous background execution
  // so the job starts immediately without waiting for an external cron hit
  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => {
      processJobs().catch((err) => {
        console.warn("[Background Job Auto-Trigger] Notice:", err);
      });
    });
  } else {
    setTimeout(() => {
      processJobs().catch((err) => {
        console.warn("[Background Job Auto-Trigger] Notice:", err);
      });
    }, 0);
  }

  return job.id;
}

/**
 * Get a job by ID with business context verification.
 */
export async function getJob(
  jobId: string,
  businessId?: string
): Promise<{
  id: string;
  businessId: string;
  type: string;
  status: string;
  progress: number;
  maxProgress: number;
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
} | null> {
  const where: Record<string, unknown> = { id: jobId };
  if (businessId) {
    where.businessId = businessId;
  }

  const job = await prisma.job.findFirst({ where });
  if (!job) return null;
  return {
    id: job.id,
    businessId: job.businessId,
    type: job.type,
    status: job.status,
    progress: job.progress,
    maxProgress: job.maxProgress,
    error: job.error,
    result: (job.result as Record<string, unknown> | null) ?? null,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

/**
 * Get all jobs for a business, ordered by createdAt desc.
 */
export async function getJobsForBusiness(
  businessId: string,
  limit = 50
): Promise<{
  id: string;
  businessId: string;
  type: string;
  status: string;
  progress: number;
  maxProgress: number;
  error: string | null;
  result: Record<string, unknown> | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}[]> {
  const cacheKey = `jobs:${businessId}:${limit}`;
  const cached = ApiCache.getOrSet(
    cacheKey,
    async () => {
      const jobs = await prisma.job.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return jobs.map((j) => ({
        id: j.id,
        businessId: j.businessId,
        type: j.type,
        status: j.status,
        progress: j.progress,
        maxProgress: j.maxProgress,
        error: j.error,
        result: (j.result as Record<string, unknown> | null) ?? null,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      }));
    },
    10 * 1000 // 10 second cache
  );
  return cached;
}

/**
 * Process all pending jobs. Call this from a worker/cron endpoint.
 * Processes one job at a time to avoid overwhelming the database.
 */
export async function processJobs(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  // Fetch one pending job
  const job = await prisma.job.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) {
    return { processed: 0, failed: 0 };
  }

  // Mark as processing
  await prisma.job.update({
    where: { id: job.id },
    data: { status: "processing", startedAt: new Date() },
  });

  try {
    switch (job.type) {
      case "knowledge_sync":
        await processKnowledgeSyncJob(job as PrismaJob);
        break;
      case "embedding":
        await processEmbeddingJob(job as PrismaJob);
        break;
      case "crawl":
        await processCrawlJob(job as PrismaJob);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
      },
    });
    processed++;
  } catch (err: unknown) {
    const errorMessage = (err as { message?: string }).message ?? "Unknown error";

    // If this was a knowledge_sync job, mark the source as failed so the
    // merchant can see the error and retry, instead of being stuck in "indexing".
    if (job.type === "knowledge_sync") {
      const payload = (job.payload as Record<string, unknown>) ?? {};
      const sourceId = String(payload.sourceId || "");
      if (sourceId) {
        await prisma.knowledgeSource.update({
          where: { id: sourceId },
          data: {
            status: "failed",
            metadata: {
              error: errorMessage,
              failedAt: new Date().toISOString(),
            },
          },
        });
      }
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      },
    });
    failed++;
  }

  // Invalidate cache
  ApiCache.invalidate(`jobs:${job.businessId}`);

  return { processed, failed };
}

/**
 * Process a knowledge sync job: crawl URL, extract, chunk, embed, store.
 *
 * Atomic replacement: old chunks are deleted and new chunks inserted within
 * a single transaction. If anything fails, the transaction rolls back and
 * the existing chunks (and source) remain untouched. The source is only
 * marked "ready" after successful chunk insertion; on failure it is marked
 * "failed" with the error message preserved.
 */
async function processKnowledgeSyncJob(job: PrismaJob): Promise<void> {
  const payload = (job.payload as Record<string, unknown>) ?? {};
  const sourceUrl = String(payload.sourceUrl || "");
  const businessId = job.businessId;
  const title = String(payload.title || new URL(sourceUrl).hostname);
  const type = String(payload.type || "webpage");

  const sourceId = String(payload.sourceId || "");

  // Crawl
  const crawler = new WebsiteCrawler(sourceUrl);
  const crawledPages = await crawler.crawl({
    maxPages: 10,
    timeoutMs: 10000,
  });

  if (crawledPages.length === 0) {
    throw new Error("No crawlable pages found");
  }

  // Extract and chunk
  const existingHashes = new Set<string>();
  const allChunkInputs: Array<{
    content: string;
    title: string;
    sourceUrl: string;
    sourceId: string;
    businessId: string;
    metadata?: Record<string, unknown>;
  }> = [];

  for (const page of crawledPages) {
    try {
      const extracted = ContentExtractor.extract(page.url, page.html);
      for (const chunk of extracted.chunks) {
        allChunkInputs.push({
          content: chunk.content,
          title: chunk.title || page.title,
          sourceUrl: chunk.sourceUrl || page.url,
          sourceId,
          businessId,
          metadata: {
            sourceType: "webpage",
            crawledUrl: page.url,
            statusCode: page.statusCode,
          },
        });
      }
    } catch {
      // Skip failed pages
    }
  }

  if (allChunkInputs.length === 0) {
    throw new Error("No extractable content");
  }

  const allChunks: Array<{
    content: string;
    contentHash: string;
    title: string;
    sourceUrl: string;
    sourceId: string;
    businessId: string;
    chunkIndex: number;
    totalChunks: number;
    metadata: Record<string, unknown>;
    tokenCount: number;
  }> = [];

  for (const input of allChunkInputs) {
    const chunks = textChunker.chunk(input, existingHashes);
    for (const chunk of chunks) {
      allChunks.push({
        content: chunk.content,
        contentHash: chunk.contentHash,
        title: chunk.title,
        sourceUrl: chunk.sourceUrl || input.sourceUrl,
        sourceId: chunk.sourceId || input.sourceId,
        businessId: chunk.businessId || input.businessId,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        metadata: chunk.metadata,
        tokenCount: chunk.tokenCount,
      });
    }
    if (allChunks.length >= 200) break;
  }

  if (allChunks.length === 0) {
    throw new Error("No chunks produced");
  }

  // Embed in batches
  const texts = allChunks.map((c) => c.content);
  const embeddingResults = await embeddingProvider.embedBatch(texts, 10);

  // Build chunk records with embeddings
  const chunkRecords = allChunks.map((chunk, idx) => {
    const embResult = embeddingResults[idx] ?? { embedding: [], model: "failed", dimensions: 0 };
    const pgLiteral = embResult.embedding.length > 0 ? embeddingProvider.toPgLiteral(embResult.embedding) : null;

    return {
      id: crypto.randomUUID(),
      businessId,
      sourceId,
      content: chunk.content,
      embedding: pgLiteral,
      metadata: {
        ...chunk.metadata,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        tokenCount: chunk.tokenCount,
        embeddingModel: embResult.model,
      },
      contentHash: chunk.contentHash,
    };
  });

  const embeddedCount = chunkRecords.filter((r) => r.embedding).length;
  const contentHash = createHash("sha256").update(sourceUrl).digest("hex");

  // Atomic transaction: delete old chunks, insert new ones, update source.
  // If any step fails, everything rolls back and old data stays intact.
  await prisma.$transaction(async (tx) => {
    // Delete existing chunks for this source (idempotent re-index)
    await tx.knowledgeChunk.deleteMany({ where: { sourceId } });

    // Insert new chunks
    for (const record of chunkRecords) {
      await tx.knowledgeChunk.create({
        data: {
          id: record.id,
          businessId: record.businessId,
          sourceId: record.sourceId,
          content: record.content,
          embedding: record.embedding ?? undefined,
          metadata: record.metadata as unknown as Prisma.InputJsonValue,
          contentHash: record.contentHash,
        },
      });
    }

    // Update source status to ready
    await tx.knowledgeSource.upsert({
      where: { id: sourceId },
      update: {
        status: "ready",
        lastIndexedAt: new Date(),
        contentHash,
        metadata: {
          chunkCount: chunkRecords.length,
          embeddedCount,
          lastCrawledAt: new Date().toISOString(),
          crawledPages: crawledPages.length,
        },
      },
      create: {
        id: sourceId,
        businessId,
        title,
        type,
        sourceUrl,
        status: "ready",
        contentHash,
        metadata: {
          chunkCount: chunkRecords.length,
          embeddedCount,
          createdAt: new Date().toISOString(),
        },
      },
    });
  });

  // Record embedding usage for billing/limits
  try {
    await recordEmbeddingUsage({
      businessId,
      count: chunkRecords.length,
      model: embeddingProvider.getConfig().model,
      requestId: job.id,
      success: true,
    });
  } catch {
    // Best effort only; do not fail the job if usage recording fails
  }

  await prisma.job.update({
    where: { id: job.id },
    data: { progress: 100 },
  });
}

async function processEmbeddingJob(job: PrismaJob): Promise<void> {
  // Placeholder for standalone embedding jobs
  await prisma.job.update({
    where: { id: job.id },
    data: { progress: 100 },
  });
}

async function processCrawlJob(job: PrismaJob): Promise<void> {
  // Placeholder for standalone crawl jobs
  await prisma.job.update({
    where: { id: job.id },
    data: { progress: 100 },
  });
}
