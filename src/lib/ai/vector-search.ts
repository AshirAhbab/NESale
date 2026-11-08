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

export class VectorSearch {
  private readonly DEFAULT_LIMIT = 5;
  private readonly DEFAULT_MIN_SIMILARITY = 0.3;

  /**
   * Performs semantic similarity search against knowledge chunks for a business.
   * Uses pgvector cosine similarity via raw SQL.
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

    // Filter by minimum similarity (cosine distance threshold)
    // cosine_distance <=> returns 0 for identical, 2 for opposite
    // similarity = 1 - distance, so distance < (1 - minSimilarity)
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
      console.warn("[VectorSearch] Raw SQL query failed:", err);
      return [];
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
      return false;
    }
  }
}

export const vectorSearch = new VectorSearch();
