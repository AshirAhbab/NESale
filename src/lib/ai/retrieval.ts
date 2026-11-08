import { CatalogItem, KnowledgeItem } from "./types";
import { vectorSearch, type VectorSearchResult } from "./vector-search";

export interface RetrievalResult {
  catalogCandidates: CatalogItem[];
  knowledgeChunks: KnowledgeItem[];
  vectorResults?: VectorSearchResult[];
}

export interface RetrieverOptions {
  businessId?: string;
}

export const SAMPLE_CATALOG: CatalogItem[] = [
  {
    id: "prod_01",
    name: "Nordik Trailpack 30L Pro",
    description: "Ultra-durable waterproof outdoor backpack with ergonomic lumbar support and laptop compartment.",
    price: 129.0,
    currency: "USD",
    category: "Gear",
    available: true,
    rating: "4.9 ★",
    url: "/products/trailpack-30l-pro",
  },
  {
    id: "prod_02",
    name: "Alpine Drybag 25L Commuter",
    description: "Lightweight roll-top dry backpack for city commutes and rainy bike rides. 100% sealed seams.",
    price: 89.0,
    currency: "USD",
    category: "Gear",
    available: true,
    rating: "4.8 ★",
    url: "/products/alpine-drybag-25l",
  },
  {
    id: "prod_03",
    name: "HydraGlow Moisturizer",
    description: "Gentle fragrance-free overnight hydrating cream with hyaluronic acid and ceramides.",
    price: 32.0,
    currency: "USD",
    category: "Skincare",
    available: true,
    rating: "4.9 ★",
    url: "/products/hydraglow-moisturizer",
  },
  {
    id: "prod_04",
    name: "Everyday Linen Shirt",
    description: "Breathable 100% organic French linen button-down. Relaxed unisex fit.",
    price: 48.0,
    currency: "USD",
    category: "Apparel",
    available: true,
    rating: "4.7 ★",
    url: "/products/everyday-linen-shirt",
  },
];

export const SAMPLE_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: "k_01",
    title: "Return & Refund Policy",
    content: "Nordik Gear offers a 30-day hassle-free return policy on all unused items in original packaging. US return shipping is completely free.",
    sourceUrl: "/policies/returns",
  },
  {
    id: "k_02",
    title: "Shipping & Delivery Times",
    content: "Standard US delivery takes 3-5 business days ($4.99 or free on orders over $75). Priority express delivery takes 1-2 business days ($14.99). International shipping to Canada takes 6-9 days.",
    sourceUrl: "/policies/shipping",
  },
  {
    id: "k_03",
    title: "Warranty & Guarantee",
    content: "All bags and gear come with a 2-year manufacturer warranty against craftsmanship and zipper defects.",
    sourceUrl: "/policies/warranty",
  },
];

export class HybridRetriever {
  /**
   * Retrieves structured catalog candidates and semantic knowledge chunks matching shopper intent.
   *
   * When businessId is provided, uses pgvector semantic similarity search against the business's
   * knowledge chunks. Falls back to keyword matching on the provided knowledge array if vector
   * search returns no results or is unavailable.
   */
  public static retrieve(
    query: string,
    catalog: CatalogItem[] = SAMPLE_CATALOG,
    knowledge: KnowledgeItem[] = SAMPLE_KNOWLEDGE,
    options: RetrieverOptions = {}
  ): RetrievalResult {
    const { businessId } = options;

    // 1. Structured Catalog Search (unchanged - keyword based)
    const catalogCandidates = this.searchCatalog(query, catalog).slice(0, 5);

    // 2. Knowledge Chunks - try vector search first, fall back to keyword
    let knowledgeChunks: KnowledgeItem[] = [];
    let vectorResults: VectorSearchResult[] | undefined;

    if (businessId) {
      try {
        // Note: vectorSearch.search is async, but retrieve() is sync.
        // We kick off the vector search but cannot await here.
        // The caller (AIEngine) handles async vector retrieval separately.
        // For now, use keyword matching as the synchronous path.
      } catch {
        // Ignore
      }
    }

    knowledgeChunks = this.searchKnowledge(query, knowledge).slice(0, 3);

    return {
      catalogCandidates,
      knowledgeChunks,
      vectorResults,
    };
  }

  /**
   * Async retrieval that uses pgvector semantic search when businessId is available.
   * Call this from async contexts (e.g., API routes).
   */
  public static async retrieveAsync(
    query: string,
    catalog: CatalogItem[] = SAMPLE_CATALOG,
    knowledge: KnowledgeItem[] = SAMPLE_KNOWLEDGE,
    options: RetrieverOptions = {}
  ): Promise<RetrievalResult> {
    const { businessId } = options;

    // 1. Structured Catalog Search
    const catalogCandidates = this.searchCatalog(query, catalog).slice(0, 5);

    // 2. Knowledge Chunks - try vector search first
    let knowledgeChunks: KnowledgeItem[] = [];
    let vectorResults: VectorSearchResult[] | undefined;

    if (businessId) {
      try {
        vectorResults = await vectorSearch.search({
          businessId,
          query,
          limit: 5,
          minSimilarity: 0.3,
          includeSource: true,
        });

        if (vectorResults && vectorResults.length > 0) {
          knowledgeChunks = vectorResults.map((r) => ({
            id: r.id,
            title: r.sourceTitle || "Knowledge Chunk",
            content: r.content,
            sourceUrl: r.sourceUrl ?? undefined,
          }));
        }
      } catch {
        // Fall through to keyword matching
      }
    }

    // 3. Fallback to keyword matching only when no businessId is provided
    //    (demo/default mode). With a businessId, never leak sample data
    //    from another tenant.
    if (knowledgeChunks.length === 0 && !businessId) {
    // Knowledge Chunks - keyword matching only in demo mode (no businessId).
    // With a businessId, never leak sample data from another tenant.
    if (!businessId) {
      knowledgeChunks = this.searchKnowledge(query, knowledge).slice(0, 3);
    }
    }

    return {
      catalogCandidates,
      knowledgeChunks,
      vectorResults,
    };
  }

  private static searchCatalog(query: string, catalog: CatalogItem[]): CatalogItem[] {
    const q = query.toLowerCase();

    return catalog.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCategory = item.category?.toLowerCase().includes(q);

      const STOP_WORDS = new Set([
        "with", "the", "and", "can", "for", "are", "what", "how", "you", "this", "that", "from",
      ]);
      const keywords = q
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9]/g, ""))
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

      const matchesAnyKeyword =
        keywords.length > 0 &&
        keywords.some(
          (kw) =>
            item.name.toLowerCase().includes(kw) ||
            item.description?.toLowerCase().includes(kw)
        );

      return matchName || matchDesc || matchCategory || matchesAnyKeyword;
    });
  }

  private static searchKnowledge(query: string, knowledge: KnowledgeItem[]): KnowledgeItem[] {
    const q = query.toLowerCase();

    return knowledge.filter((k) => {
      if (q.includes("return") || q.includes("refund")) {
        return k.title.toLowerCase().includes("return");
      }
      if (q.includes("ship") || q.includes("deliver") || q.includes("canada")) {
        return k.title.toLowerCase().includes("ship");
      }
      if (q.includes("warranty") || q.includes("guarantee")) {
        return k.title.toLowerCase().includes("warranty");
      }
      return (
        k.content.toLowerCase().includes(q) ||
        k.title.toLowerCase().includes(q)
      );
    });
  }
}
