import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import crypto from "crypto";

const KNOWLEDGE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const KNOWLEDGE_RATE_LIMIT_MAX = 60;

/**
 * Resolve and authorize the business context for knowledge operations.
 * Returns the authorized businessId or null if unauthorized.
 */
async function resolveAuthorizedBusinessId(
  req: NextRequest,
  requestedBizId: string | null
): Promise<{ businessId: string; businessName: string } | null> {
  const tenant = await resolveCachedTenant(req, requestedBizId ?? undefined);
  if (!tenant || !tenant.business) {
    return null;
  }

  // If a specific businessId was requested, verify the resolved tenant matches it.
  // resolveCachedTenant may fall back to a different business if the user isn't a member
  // of the requested one - in that case we reject to prevent cross-tenant access.
  if (requestedBizId && tenant.business.id !== requestedBizId) {
    return null;
  }

  return {
    businessId: tenant.business.id,
    businessName: tenant.business.name,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");
    const requestedTeamId = searchParams.get("teamId");

    // Rate limiting
    const rateLimitKey = `knowledge:get:${requestedBizId || "default"}:${requestedTeamId || "all"}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      KNOWLEDGE_RATE_LIMIT_WINDOW_MS,
      KNOWLEDGE_RATE_LIMIT_MAX
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again shortly.",
            retryAfterMs: Math.max(0, resetAt - Date.now()),
          },
        },
        { status: 429 }
      );
    }

    // Authorize business context
    const auth = await resolveAuthorizedBusinessId(req, requestedBizId);
    if (!auth) {
      return NextResponse.json(
        { error: { message: "Business not found or access denied." } },
        { status: 404 }
      );
    }

    const { businessId } = auth;

    const sources = await prisma.knowledgeSource.findMany({
      where: {
        businessId,
        ...(requestedTeamId ? { teamId: requestedTeamId } : {}),
      },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            contentHash: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = sources.map((s) => {
      const firstChunk = s.chunks[0]?.content || "";
      return {
        id: s.id,
        title: s.title || "Untitled Knowledge Source",
        type: s.type || "policy",
        sourceUrl: s.sourceUrl || undefined,
        chunksCount: s.chunks.length,
        lastIndexed: s.lastIndexedAt
          ? s.lastIndexedAt.toISOString()
          : new Date().toISOString(),
        status: s.status || "ready",
        snippet: firstChunk.length > 150 ? firstChunk.slice(0, 150) + "..." : firstChunk,
        contentHash: s.contentHash || undefined,
        metadata: s.metadata || {},
      };
    });

    return NextResponse.json({
      status: "success",
      total: formatted.length,
      sources: formatted,
      businessId,
    });
  } catch (error: unknown) {
    console.error("[Knowledge API GET] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch knowledge sources" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      type,
      content,
      question,
      answer,
      topic,
      sourceUrl,
      businessId: requestedBizId,
      teamId,
    } = body;

    // Rate limiting
    const rateLimitKey = `knowledge:post:${requestedBizId || "default"}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      KNOWLEDGE_RATE_LIMIT_WINDOW_MS,
      KNOWLEDGE_RATE_LIMIT_MAX
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again shortly.",
            retryAfterMs: Math.max(0, resetAt - Date.now()),
          },
        },
        { status: 429 }
      );
    }

    // Authorize business context
    const auth = await resolveAuthorizedBusinessId(req, requestedBizId ?? null);
    if (!auth) {
      return NextResponse.json(
        { error: { message: "Business not found or access denied." } },
        { status: 404 }
      );
    }

    const { businessId } = auth;

    // Flexible normalization: accept both { title, content } and { question, answer }
    const effectiveTitle = title || question || (topic ? `FAQ: ${topic}` : undefined);
    const effectiveContent =
      content ||
      (question && answer ? `Question: ${question}\nAnswer: ${answer}` : answer || undefined);
    const effectiveType = type || (question || answer ? "faq" : "document");

    if (!effectiveTitle || !effectiveContent) {
      return NextResponse.json(
        { error: { message: "Title (or question) and content (or answer) are required." } },
        { status: 400 }
      );
    }

    const contentHash = cryptoHash(effectiveContent);

    const source = await prisma.knowledgeSource.create({
      data: {
        businessId,
        teamId: teamId || undefined,
        title: effectiveTitle,
        type: effectiveType,
        sourceUrl: sourceUrl || undefined,
        status: "ready",
        contentHash,
        metadata: {
          createdAt: new Date().toISOString(),
          source: "manual",
          ...(sourceUrl ? { sourceUrl } : {}),
        },
      },
    });

    // Create knowledge chunk
    await prisma.knowledgeChunk.create({
      data: {
        businessId,
        sourceId: source.id,
        content: effectiveContent,
        contentHash,
        metadata: { title: effectiveTitle, url: sourceUrl, chunkIndex: 0, totalChunks: 1 },
      },
    });

    return NextResponse.json({
      status: "success",
      source: {
        id: source.id,
        title: source.title,
        type: source.type,
        sourceUrl: source.sourceUrl || undefined,
        chunksCount: 1,
        lastIndexed: new Date().toISOString(),
        status: "ready",
        snippet: effectiveContent.length > 150 ? effectiveContent.slice(0, 150) + "..." : effectiveContent,
      },
      businessId,
    });
  } catch (error: unknown) {
    console.error("[Knowledge API POST] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to add knowledge source." } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const requestedBizId = searchParams.get("businessId");
    const requestedTeamId = searchParams.get("teamId");

    if (!id) {
      return NextResponse.json({ error: { message: "Source ID required" } }, { status: 400 });
    }

    // Authorize business context
    const auth = await resolveAuthorizedBusinessId(req, requestedBizId ?? null);
    if (!auth) {
      return NextResponse.json(
        { error: { message: "Business not found or access denied." } },
        { status: 404 }
      );
    }

    const { businessId } = auth;

    // Verify the source belongs to the authorized business before deleting
    const source = await prisma.knowledgeSource.findFirst({
      where: {
        id,
        businessId,
        ...(requestedTeamId ? { teamId: requestedTeamId } : {}),
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: { message: "Knowledge source not found or access denied." } },
        { status: 404 }
      );
    }

    // Delete chunks first (cascade via FK, but explicit for clarity)
    await prisma.knowledgeChunk.deleteMany({ where: { sourceId: id } });

    await prisma.knowledgeSource.delete({
      where: { id },
    });

    return NextResponse.json({ status: "success", deletedId: id, businessId });
  } catch (error: unknown) {
    console.error("[Knowledge API DELETE] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to delete" } },
      { status: 500 }
    );
  }
}

function cryptoHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
