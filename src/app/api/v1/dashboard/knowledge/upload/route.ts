import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import { enqueueJob } from "@/lib/jobs/queue";
import { checkEmbeddingLimit } from "@/lib/ai/usage";
import { textChunker } from "@/lib/ai/chunker";
import { embeddingProvider } from "@/lib/ai/embedding";
import { recordEmbeddingUsage } from "@/lib/ai/usage";
import { createHash } from "crypto";

const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const UPLOAD_RATE_LIMIT_MAX = 10;

// Max file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported text-based file types
const SUPPORTED_EXTENSIONS = [".txt", ".md", ".csv", ".json"];
const SUPPORTED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/x-markdown",
];

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function extractTextFromBuffer(buffer: Buffer, mimeType: string): string {
  const text = buffer.toString("utf-8");
  if (!text || text.trim().length === 0) {
    throw new Error("No extractable text found in document.");
  }
  return text;
}

/**
 * POST /api/v1/dashboard/knowledge/upload
 *
 * Uploads a text-based document (.txt, .md, .csv, .json) for knowledge-base
 * ingestion. The file is parsed, chunked, embedded, and stored as a knowledge
 * source with associated chunks.
 *
 * PDF (.pdf) support requires the `pdf-parse` package to be installed;
   this route returns a 400 for PDF until that dependency is added.
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const businessId = formData.get("businessId") as string | null;
    const title = (formData.get("title") as string) || undefined;
    const type = (formData.get("type") as string) || "document";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "File is required", requestId } },
        { status: 400 }
      );
    }

    if (!businessId || typeof businessId !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "businessId is required", requestId } },
        { status: 400 }
      );
    }

    // SSRF/tenant authorization
    const tenant = await resolveCachedTenant(businessId);
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

    // Rate limiting
    const rateLimitKey = `knowledge:upload:${businessId}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      UPLOAD_RATE_LIMIT_WINDOW_MS,
      UPLOAD_RATE_LIMIT_MAX
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Upload rate limit exceeded. Try again later.",
            requestId,
            retryAfterMs: Math.max(0, resetAt - Date.now()),
          },
        },
        { status: 429 }
      );
    }

    // File validation
    const fileName = file.name;
    const ext = getFileExtension(fileName);

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_FILE_TYPE",
            message: `File type "${ext}" is not supported. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}. PDF requires the pdf-parse package.`,
            requestId,
          },
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: {
            code: "FILE_TOO_LARGE",
            message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`,
            requestId,
          },
        },
        { status: 400 }
      );
    }

    const mimeType = file.type || "text/plain";
    if (!SUPPORTED_MIME_TYPES.includes(mimeType) && ext !== ".txt") {
      // Allow .txt even if mime type is generic
      if (ext !== ".txt") {
        return NextResponse.json(
          {
            error: {
              code: "UNSUPPORTED_FILE_TYPE",
              message: `MIME type "${mimeType}" is not supported.`,
              requestId,
            },
          },
          { status: 400 }
        );
      }
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text
    let extractedText: string;
    try {
      extractedText = extractTextFromBuffer(buffer, mimeType);
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "EXTRACTION_FAILED",
            message: (err as Error).message || "Failed to extract text from document.",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    if (extractedText.trim().length < 50) {
      return NextResponse.json(
        {
          error: {
            code: "INSUFFICIENT_CONTENT",
            message: "Document contains too little text to index (minimum 50 characters).",
            requestId,
          },
        },
        { status: 400 }
      );
    }

    // Check embedding limit (estimate: 1 chunk per ~500 chars, capped at 200)
    const estimatedChunks = Math.min(200, Math.ceil(extractedText.length / 400));
    const embeddingLimit = await checkEmbeddingLimit(businessId, estimatedChunks);
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

    // Chunk the document
    const contentHash = createHash("sha256").update(extractedText).digest("hex");
    const sourceTitle = title || fileName;

    // Check if source already exists (re-upload)
    let source = await prisma.knowledgeSource.findFirst({
      where: { businessId, sourceUrl: fileName },
    });

    if (source) {
      await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: {
          status: "indexing",
          title: sourceTitle,
          contentHash,
          metadata: {
            ...(source.metadata as Record<string, unknown> ?? {}),
            reuploadedAt: new Date().toISOString(),
            originalFileName: fileName,
            fileSize: file.size,
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
          sourceUrl: fileName,
          status: "indexing",
          contentHash,
          metadata: {
            createdAt: new Date().toISOString(),
            source: "upload",
            originalFileName: fileName,
            fileSize: file.size,
            mimeType,
          },
        },
      });
    }

    const sourceId = source.id;

    // Chunk text
    const chunks = textChunker.chunk(
      {
        content: extractedText,
        title: sourceTitle,
        sourceUrl: fileName,
        sourceId,
        businessId,
        metadata: { sourceType: "upload", originalFileName: fileName },
      },
      new Set()
    );

    if (chunks.length === 0) {
      throw new Error("No chunks produced from document.");
    }

    // Generate embeddings
    const texts = chunks.map((c) => c.content);
    const embeddingResults = await embeddingProvider.embedBatch(texts, 10);

    const embeddedCount = embeddingResults.filter((r) => r.embedding.length > 0).length;

    // Build chunk records
    const chunkRecords = chunks.map((chunk, idx) => {
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

    // Atomic insert
    await prisma.$transaction(
      chunkRecords.map((record) =>
        prisma.knowledgeChunk.create({
          data: {
            id: record.id,
            businessId: record.businessId,
            sourceId: record.sourceId,
            content: record.content,
            embedding: record.embedding ?? undefined,
            metadata: record.metadata as unknown as Parameters<typeof prisma.knowledgeChunk.create>[0]["data"]["metadata"],
            contentHash: record.contentHash,
          },
        })
      )
    );

    // Update source to ready
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: {
        status: "ready",
        lastIndexedAt: new Date(),
        contentHash,
        metadata: {
          ...(source.metadata as Record<string, unknown> ?? {}),
          chunkCount: chunkRecords.length,
          embeddedCount,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Record embedding usage
    try {
      await recordEmbeddingUsage({
        businessId,
        count: chunkRecords.length,
        model: embeddingProvider.getConfig().model,
        requestId,
        success: true,
      });
    } catch {
      // Best effort
    }

    // Invalidate caches
    ApiCache.invalidate(`knowledge:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      requestId,
      source: {
        id: source.id,
        title: source.title,
        type: source.type,
        sourceUrl: source.sourceUrl,
        status: "ready",
        chunksCount: chunkRecords.length,
        embeddedCount,
        lastIndexed: new Date().toISOString(),
      },
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Knowledge Upload] Request failed [${requestId}]:`, error);

    let code = "INTERNAL_ERROR";
    let message = "Document upload failed.";
    let statusCode = 500;

    if ((error as { code?: string }).code) {
      code = (error as { code?: string }).code ?? "";
      message = (error as { message?: string }).message ?? "";
    }

    return NextResponse.json(
      { error: { code, message, requestId } },
      { status: statusCode }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "POST /api/v1/dashboard/knowledge/upload",
    supportedExtensions: SUPPORTED_EXTENSIONS,
    maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    note: "PDF (.pdf) support requires installing the `pdf-parse` package.",
  });
}
