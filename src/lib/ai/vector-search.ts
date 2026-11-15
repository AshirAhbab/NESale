import { prisma } from "@/lib/db/prisma";
import { embeddingProvider } from "./embedding";

export interface VectorSearchResult {
  id: string;
  businessId: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  contentHash?: string | null;
  similarity: number; // cosine similarity (1 - distance), higher = more similar
  sourceTitle?: string | null;
  sourceUrl?: string | null;
}

export interface VectorSearchOptions {
  businessId: string;
  query: string;
  limit?: number;
  minSimilarity?: number; // 0 to 1, default 0.3
  sourceId?: string;
  includeSource?: boolean;
}

/**
 * Parses vector string representations into an array of floats.
 */
export function parseEmbeddingVector(val: unknown): number[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val.map(Number);
  if (typeof val === "string") {
    try {
      const trimmed = val.trim();
      const raw = trimmed.startsWith("[") && trimmed.endsWith("]")
        ? trimmed.slice(1, -1)
        : trimmed;
      const parsed = raw.split(",").map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n));
      return parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Calculates cosine similarity between two float vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized text embeddings).
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorSearch {
  private readonly DEFAULT_LIMIT = 5;
  private readonly DEFAULT_MIN_SIMILARITY = 0.3;

  /**
   * Performs semantic similarity search against knowledge chunks for a business.
   * Attempts pgvector cosine similarity in Postgres; seamlessly falls back to
   * high-precision in-memory cosine similarity if pgvector extension is uninstalled.
   */
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const {
      businessId,
      query,
      limit = this.DEFAULT_LIMIT,
      minSimilarity = this.DEFAULT_MIN_SIMILARITY,
      sourceId,
      includeSource = false,
    } = options;

    // Generate embedding for the query
    let queryEmbedding: number[];
    try {
      const result = await embeddingProvider.embed(query);
      queryEmbedding = result.embedding;
    } catch {
      // If embedding fails entirely, return empty results
      return [];
    }

    const pgLiteral = embeddingProvider.toPgLiteral(queryEmbedding);

    // Build raw SQL query with pgvector cosine similarity
    let sql = `
      SELECT
        kc.id,
        kc.business_id AS "businessId",
        kc.source_id AS "sourceId",
        kc.content,
        kc.metadata,
        kc.content_hash AS "contentHash",
        (1 - (kc.embedding <=> $1::vector)) AS similarity
      FROM knowledge_chunks kc
      WHERE kc.business_id = $2
        AND kc.embedding IS NOT NULL
    `;

    const params: unknown[] = [pgLiteral, businessId];
    let paramIndex = 3;

    if (sourceId) {
      sql += ` AND kc.source_id = $${paramIndex}`;
      params.push(sourceId);
      paramIndex++;
    }

    sql += ` AND (1 - (kc.embedding <=> $1::vector)) > $${paramIndex}`;
    params.push(minSimilarity);
    paramIndex++;

    sql += ` ORDER BY kc.embedding <=> $1::vector ASC`;
    sql += ` LIMIT $${paramIndex}`;
    params.push(limit);

    let rawResult: Record<string, unknown>[];
    try {
      rawResult = await prisma.$queryRawUnsafe(sql, ...params);
    } catch (err) {
      // Graceful fallback: Compute in-memory cosine similarity across chunks
      console.warn("[VectorSearch] Native pgvector query unexecutable, using in-memory cosine similarity fallback:", err);
      rawResult = await this.fallbackMemorySearch(businessId, queryEmbedding, limit, minSimilarity, sourceId);
    }

    // Optionally fetch source titles/urls
    const sourcesMap: Map<string, { title: string | null; sourceUrl: string | null }> = new Map();
    if (includeSource && rawResult.length > 0) {
      const sourceIds = [...new Set(rawResult.map((r) => String(r.sourceId)))];
      try {
        const sources = await prisma.knowledgeSource.findMany({
          where: { id: { in: sourceIds as string[] } },
          select: { id: true, title: true, sourceUrl: true },
        });
        for (const s of sources) {
          sourcesMap.set(s.id, { title: s.title ?? null, sourceUrl: s.sourceUrl ?? null });
        }
      } catch {
        // Ignore source lookup failures
      }
    }

    return rawResult.map((row) => {
      const sourceInfo = includeSource ? sourcesMap.get(String(row.sourceId)) : undefined;
      return {
        id: String(row.id),
        businessId: String(row.businessId),
        sourceId: String(row.sourceId),
        content: String(row.content),
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        contentHash: (row.contentHash as string | null) ?? null,
        similarity: Number(row.similarity) || 0,
        sourceTitle: sourceInfo?.title ?? null,
        sourceUrl: sourceInfo?.sourceUrl ?? null,
      };
    });
  }

  /**
   * Resilient in-memory fallback search when PostgreSQL vector extension is absent.
   */
  private async fallbackMemorySearch(
    businessId: string,
    queryEmbedding: number[],
    limit: number,
    minSimilarity: number,
    sourceId?: string
  ): Promise<Record<string, unknown>[]> {
    try {
      const chunks = await prisma.knowledgeChunk.findMany({
        where: {
          businessId,
          embedding: { not: null },
          ...(sourceId ? { sourceId } : {}),
        },
        select: {
          id: true,
          businessId: true,
          sourceId: true,
          content: true,
          embedding: true,
          metadata: true,
          contentHash: true,
        },
        take: 500, // Safe bounding for in-memory score
      });

      const scored = chunks
        .map((chunk) => {
          const vector = parseEmbeddingVector(chunk.embedding);
          if (!vector) return null;
          const similarity = computeCosineSimilarity(queryEmbedding, vector);
          return {
            id: chunk.id,
            businessId: chunk.businessId,
            sourceId: chunk.sourceId,
            content: chunk.content,
            metadata: chunk.metadata,
            contentHash: chunk.contentHash,
            similarity,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return scored as unknown as Record<string, unknown>[];
    } catch (fallbackErr) {
      console.warn("[VectorSearch] In-memory fallback failed:", fallbackErr);
      return [];
    }
  }

  /**
   * Checks whether any chunks with embeddings exist for a business.
   */
  async hasEmbeddedChunks(businessId: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS count FROM knowledge_chunks WHERE business_id = $1 AND embedding IS NOT NULL`,
        businessId
      );
      const rows = result as { count: bigint }[];
      return Number(rows[0]?.count) > 0;
    } catch {
      try {
        const count = await prisma.knowledgeChunk.count({
          where: { businessId, embedding: { not: null } },
        });
        return count > 0;
      } catch {
        return false;
      }
    }
  }
}

export const vectorSearch = new VectorSearch();
