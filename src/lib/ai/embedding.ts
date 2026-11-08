import { GoogleGenAI } from "@google/genai";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  tokens?: number;
}

export interface EmbeddingProviderConfig {
  provider: "gemini" | "none";
  apiKey?: string;
  model: string;
  dimensions: number;
  rejectFallback: boolean;
}

export function loadEmbeddingConfig(): EmbeddingProviderConfig {
  const provider = (process.env.EMBEDDING_PROVIDER || "gemini") as "gemini" | "none";
  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = process.env.EMBEDDING_MODEL || "text-embedding-004";
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS || "768");
  const rejectFallback = process.env.EMBEDDING_REJECT_FALLBACK === "true";

  return { provider, apiKey, model, dimensions, rejectFallback };
}

function stringToVector(text: string, dimensions: number): number[] {
  // Deterministic hash-based embedding for offline/dev environments.
  // Produces a consistent vector from text using a seeded hash.
  const vector: number[] = new Array(dimensions).fill(0);
  const lower = text.toLowerCase();

  for (let i = 0; i < lower.length; i++) {
    const code = lower.charCodeAt(i);
    for (let j = 0; j < dimensions; j++) {
      const hash = (i * 31 + code * 17 + j * 13) % 1000;
      vector[j] += Math.sin(hash) * 0.01;
    }
  }

  // Normalize to unit length
  let norm = 0;
  for (let j = 0; j < dimensions; j++) {
    norm += vector[j] * vector[j];
  }
  norm = Math.sqrt(norm) || 1;
  for (let j = 0; j < dimensions; j++) {
    vector[j] /= norm;
  }

  return vector;
}

function vectorToPgLiteral(vector: number[]): string {
  return `[${vector.map((v) => v.toFixed(6)).join(",")}]`;
}

export class EmbeddingProvider {
  private config: EmbeddingProviderConfig;
  private geminiClient: GoogleGenAI | null = null;

  constructor(config?: Partial<EmbeddingProviderConfig>) {
    const base = loadEmbeddingConfig();
    this.config = {
      ...base,
      ...config,
      model: config?.model ?? base.model,
      dimensions: config?.dimensions ?? base.dimensions,
      rejectFallback: config?.rejectFallback ?? base.rejectFallback,
    };
  }

  getConfig(): EmbeddingProviderConfig {
    return { ...this.config };
  }

  private getGeminiClient(): GoogleGenAI | null {
    if (!this.config.apiKey) return null;
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenAI({ apiKey: this.config.apiKey });
    }
    return this.geminiClient;
  }

  /**
   * Generates an embedding for a single text.
   * Returns a Float32-compatible array of length `dimensions`.
   */
  async embed(text: string): Promise<EmbeddingResult> {
    if (this.config.provider === "gemini" && this.config.apiKey) {
      try {
        return await this.embedWithGemini(text);
      } catch (err) {
        if (this.config.rejectFallback) {
          throw new Error(`Gemini embedding failed and fallback is rejected: ${(err as Error).message}`);
        }
        console.warn("[EmbeddingProvider] Gemini embedding failed, falling back to deterministic:", err);
      }
    }
    return this.embedDeterministic(text);
  }

  /**
   * Generates embeddings for multiple texts in bounded batches.
   */
  async embedBatch(texts: string[], batchSize = 10): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((t) => this.embed(t)));
      results.push(...batchResults);
    }
    return results;
  }

  private async embedWithGemini(text: string): Promise<EmbeddingResult> {
    const client = this.getGeminiClient();
    if (!client) {
      return this.embedDeterministic(text);
    }

    const response = await client.models.embedContent({
      model: this.config.model,
      contents: [{ parts: [{ text }] }],
      config: {
        outputDimensionality: this.config.dimensions,
      },
    });

    const embeddings = response.embeddings ?? [];
    const first = embeddings[0];
    const values = first?.values ?? [];

    if (values.length === 0) {
      return this.embedDeterministic(text);
    }

    return {
      embedding: values,
      model: this.config.model,
      dimensions: values.length,
    };
  }

  private embedDeterministic(text: string): EmbeddingResult {
    const embedding = stringToVector(text, this.config.dimensions);
    return {
      embedding,
      model: "deterministic-hash",
      dimensions: embedding.length,
    };
  }

  /**
   * Converts an embedding array to a pgvector literal string for raw SQL queries.
   */
  toPgLiteral(embedding: number[]): string {
    return vectorToPgLiteral(embedding);
  }
}

export const embeddingProvider = new EmbeddingProvider();
