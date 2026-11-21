import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ApiCache } from "@/lib/cache/apiCache";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { enqueueJob } from "@/lib/jobs/queue";
import { checkEmbeddingLimit } from "@/lib/ai/usage";
import { createHash } from "crypto";

const INGESTION_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const INGESTION_RATE_LIMIT_MAX = 10;

// Private IP ranges and localhost for SSRF protection
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^localhost$/,
  /^::1$/,
  /^::ffff:127\./,
];

function isSSRFRisk(urlString: string): { isRisk: boolean; reason?: string } {
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { isRisk: true, reason: `Protocol ${url.protocol} not allowed` };
    }
    const hostname = url.hostname.toLowerCase();
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { isRisk: true, reason: `Hostname matches private range: ${hostname}` };
      }
    }
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^\[[0-9a-f:]+\]$/;
    if (ipv4Regex.test(hostname) || ipv6Regex.test(hostname)) {
      return { isRisk: true, reason: "Direct IP addresses not allowed" };
    }
    return { isRisk: false };
  } catch {
    return { isRisk: true, reason: "Invalid URL" };
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json();
    const { sourceUrl, businessId, title, type = "webpage" } = body;

    // Validate required fields
    if (!sourceUrl || typeof sourceUrl !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "sourceUrl is required", requestId } },
        { status: 400 }
      );
    }

    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "businessId is required", requestId } },
        { status: 400 }
      );
    }

    // SSRF protection
    const ssrfCheck = isSSRFRisk(sourceUrl);
    if (ssrfCheck.isRisk) {
      return NextResponse.json(
        {
          error: {
            code: "SSRF_BLOCKED",
            message: ssrfCheck.reason || "URL blocked for security",
            requestId,
          },
        },
        { status: 403 }
      );
    }

    // Resolve and authorize tenant
    const tenant = await resolveCachedTenant(req, businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { code: "TENANT_NOT_FOUND", message: "Business not found", requestId } },
        { status: 404 }
      );
    }

    if (tenant.business.id !== businessId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not a member of this business", requestId } },
        { status: 403 }
      );
    }

    // Per-business rate limiting
    const rateLimitKey = `ingestion:rate:${businessId}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      INGESTION_RATE_LIMIT_WINDOW_MS,
      INGESTION_RATE_LIMIT_MAX
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Ingestion rate limit exceeded. Try again later.",
            requestId,
            retryAfterMs: Math.max(0, resetAt - Date.now()),
          },
        },
        { status: 429 }
      );
    }

    // Check embedding usage limit (max 200 chunks per ingestion)
    const embeddingLimit = await checkEmbeddingLimit(businessId, 200);
    if (!embeddingLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "EMBEDDING_LIMIT_EXCEEDED",
            message: embeddingLimit.reason || "Daily embedding limit exceeded.",
            requestId,
          },
        },
        { status: 429 }
      );
    }

    // Create or update KnowledgeSource as indexing
    const contentHash = createHash("sha256").update(sourceUrl).digest("hex");
    const sourceTitle = title || new URL(sourceUrl).hostname;

    let source = await prisma.knowledgeSource.findFirst({
      where: { businessId, sourceUrl },
    });

    if (source) {
      source = await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: {
          status: "indexing",
          title: sourceTitle,
          type,
          contentHash,
          lastIndexedAt: new Date(),
          metadata: {
            ...(source.metadata as Record<string, unknown> ?? {}),
            reindexedAt: new Date().toISOString(),
          },
        },
      });

      await prisma.knowledgeChunk.deleteMany({ where: { sourceId: source.id } });
    } else {
      source = await prisma.knowledgeSource.create({
        data: {
          businessId,
          title: sourceTitle,
          type,
          sourceUrl,
          status: "indexing",
          contentHash,
          metadata: { createdAt: new Date().toISOString() },
        },
      });
    }

    // Enqueue background job
    const jobId = await enqueueJob({
      businessId,
      type: "knowledge_sync",
      payload: {
        sourceUrl,
        sourceId: source.id,
        title,
        type,
      },
    });

    // Invalidate knowledge cache
    ApiCache.invalidate(`jobs:${businessId}`);
    ApiCache.invalidate(`knowledge:get:${businessId}`);

    return NextResponse.json({
      status: "accepted",
      requestId,
      jobId,
      source: {
        id: source.id,
        title: source.title,
        type: source.type,
        sourceUrl: source.sourceUrl,
        status: "indexing",
      },
      message: "Ingestion started. Poll job status for completion.",
    });
  } catch (error: unknown) {
    console.error(`[Ingestion Sync] Request failed [${requestId}]:`, error);

    let code = "INTERNAL_ERROR";
    let message = "Ingestion failed.";
    let statusCode = 500;

    if ((error as { code?: string }).code === "VALIDATION_ERROR") {
      code = (error as { code?: string }).code ?? "";
      message = (error as { message?: string }).message ?? "";
      statusCode = 400;
    } else if ((error as { code?: string }).code === "SSRF_BLOCKED") {
      code = (error as { code?: string }).code ?? "";
      message = (error as { message?: string }).message ?? "";
      statusCode = 403;
    } else if ((error as { code?: string }).code === "RATE_LIMIT_EXCEEDED") {
      code = (error as { code?: string }).code ?? "";
      message = (error as { message?: string }).message ?? "";
      statusCode = 429;
    }

    return NextResponse.json(
      { error: { code, message, requestId } },
      { status: statusCode }
    );
  }
}
