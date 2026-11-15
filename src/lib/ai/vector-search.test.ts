import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeCosineSimilarity,
  parseEmbeddingVector,
  VectorSearch,
} from "./vector-search";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    knowledgeChunk: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    knowledgeSource: {
      findMany: vi.fn(),
    },
  },
}));

describe("Vector Search & Cosine Similarity", () => {
  describe("parseEmbeddingVector", () => {
    it("parses bracketed comma-separated floats", () => {
      const vec = parseEmbeddingVector("[0.12, -0.45, 0.88]");
      expect(vec).toEqual([0.12, -0.45, 0.88]);
    });

    it("parses unbracketed comma-separated floats", () => {
      const vec = parseEmbeddingVector("1.0, 2.0, 3.0");
      expect(vec).toEqual([1.0, 2.0, 3.0]);
    });

    it("handles already parsed number arrays", () => {
      const vec = parseEmbeddingVector([0.5, 0.25]);
      expect(vec).toEqual([0.5, 0.25]);
    });

    it("returns null for invalid strings or empty values", () => {
      expect(parseEmbeddingVector("")).toBeNull();
      expect(parseEmbeddingVector(null)).toBeNull();
      expect(parseEmbeddingVector("invalid")).toBeNull();
    });
  });

  describe("computeCosineSimilarity", () => {
    it("computes 1.0 for identical unit vectors", () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      expect(computeCosineSimilarity(a, b)).toBeCloseTo(1.0);
    });

    it("computes 0.0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(computeCosineSimilarity(a, b)).toBeCloseTo(0.0);
    });

    it("computes -1.0 for opposite vectors", () => {
      const a = [1, 0];
      const b = [-1, 0];
      expect(computeCosineSimilarity(a, b)).toBeCloseTo(-1.0);
    });

    it("computes accurate fractional similarity for arbitrary vectors", () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      // dot: 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      // normA: sqrt(1 + 4 + 9) = sqrt(14) ~= 3.7416
      // normB: sqrt(16 + 25 + 36) = sqrt(77) ~= 8.7749
      // sim: 32 / (sqrt(14)*sqrt(77)) = 32 / sqrt(1078) ~= 0.97463
      expect(computeCosineSimilarity(a, b)).toBeCloseTo(0.9746, 3);
    });
  });

  describe("VectorSearch.search fallback", () => {
    let vs: VectorSearch;

    beforeEach(() => {
      vs = new VectorSearch();
      vi.clearAllMocks();
    });

    it("falls back to in-memory cosine similarity when native pgvector fails", async () => {
      // Mock raw SQL query failure (e.g. pgvector not installed in DB)
      (prisma.$queryRawUnsafe as any).mockRejectedValueOnce(
        new Error('type "vector" does not exist')
      );

      // Mock finding chunks in DB
      (prisma.knowledgeChunk.findMany as any).mockResolvedValueOnce([
        {
          id: "chunk-1",
          businessId: "biz-1",
          sourceId: "src-1",
          content: "We offer 30-day money back guarantee.",
          embedding: "[0.1, 0.2, 0.3]",
          metadata: { category: "policy" },
          contentHash: "abc",
        },
        {
          id: "chunk-2",
          businessId: "biz-1",
          sourceId: "src-1",
          content: "International shipping takes 5-7 business days.",
          embedding: "[-0.5, 0.1, 0.2]",
          metadata: { category: "shipping" },
          contentHash: "def",
        },
      ]);

      const results = await vs.search({
        businessId: "biz-1",
        query: "return policy guarantee",
        minSimilarity: 0.1,
      });

      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(prisma.knowledgeChunk.findMany).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain("money back guarantee");
    });
  });
});
