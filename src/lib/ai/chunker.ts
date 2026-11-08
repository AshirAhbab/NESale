import crypto from "crypto";

export interface ChunkInput {
  content: string;
  title: string;
  sourceUrl?: string;
  sourceId?: string;
  businessId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChunkOutput {
  content: string;
  contentHash: string;
  title: string;
  sourceUrl?: string;
  sourceId?: string;
  businessId?: string;
  chunkIndex: number;
  totalChunks: number;
  metadata: Record<string, unknown>;
  tokenCount: number;
}

export interface ChunkerConfig {
  maxTokensPerChunk: number;
  overlapTokens: number;
  minChunkTokens: number;
}

const DEFAULT_CONFIG: ChunkerConfig = {
  maxTokensPerChunk: 500,
  overlapTokens: 100,
  minChunkTokens: 50,
};

// Approximate token count: ~4 characters per token for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export class TextChunker {
  private config: ChunkerConfig;

  constructor(config?: Partial<ChunkerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getConfig(): ChunkerConfig {
    return { ...this.config };
  }

  /**
   * Splits text into overlapping chunks with deduplication.
   * Skips chunks that are too small or duplicates of existing hashes.
   */
  chunk(
    input: ChunkInput,
    existingHashes: Set<string> = new Set()
  ): ChunkOutput[] {
    const { content, title, sourceUrl, sourceId, businessId, metadata } = input;
    const { maxTokensPerChunk, overlapTokens, minChunkTokens } = this.config;

    if (!content || content.trim().length === 0) {
      return [];
    }

    const trimmed = content.trim();
    const totalTokens = estimateTokens(trimmed);

    // If content fits in one chunk, return it directly
    if (totalTokens <= maxTokensPerChunk) {
      const hash = hashContent(trimmed);
      if (existingHashes.has(hash)) {
        return [];
      }
      existingHashes.add(hash);

      return [
        {
          content: trimmed,
          contentHash: hash,
          title,
          sourceUrl,
          sourceId,
          businessId,
          chunkIndex: 0,
          totalChunks: 1,
          metadata: { ...(metadata ?? {}), charCount: trimmed.length },
          tokenCount: totalTokens,
        },
      ];
    }

    // Split into sentences first for cleaner boundaries
    const sentences = this.splitIntoSentences(trimmed);
    const chunks: ChunkOutput[] = [];
    let currentChunk = "";
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);

      // If a single sentence exceeds maxTokens, split it by characters
      if (sentenceTokens > maxTokensPerChunk) {
        // Flush current chunk first
        if (currentTokens >= minChunkTokens) {
          const chunk = this.createChunk(
            currentChunk,
            title,
            sourceUrl,
            sourceId,
            businessId,
            chunkIndex++,
            metadata,
            existingHashes
          );
          if (chunk) chunks.push(chunk);
          currentChunk = "";
          currentTokens = 0;
        }

        // Split long sentence by characters
        const charChunks = this.splitByCharacters(sentence, maxTokensPerChunk);
        for (const charChunk of charChunks) {
          const hash = hashContent(charChunk);
          if (existingHashes.has(hash)) continue;
          existingHashes.add(hash);

          chunks.push({
            content: charChunk,
            contentHash: hash,
            title,
            sourceUrl,
            sourceId,
            businessId,
            chunkIndex: chunkIndex++,
            totalChunks: 0, // updated at end
            metadata: { ...(metadata ?? {}), charCount: charChunk.length, splitByCharacters: true },
            tokenCount: estimateTokens(charChunk),
          });
        }
        continue;
      }

      // If adding this sentence would exceed maxTokens, flush current chunk
      if (currentTokens > 0 && currentTokens + sentenceTokens > maxTokensPerChunk) {
        if (currentTokens >= minChunkTokens) {
          const chunk = this.createChunk(
            currentChunk,
            title,
            sourceUrl,
            sourceId,
            businessId,
            chunkIndex++,
            metadata,
            existingHashes
          );
          if (chunk) chunks.push(chunk);
        }

        // Start new chunk with overlap from previous
        const overlapText = this.getOverlap(currentChunk, overlapTokens);
        currentChunk = overlapText + (overlapText ? " " : "") + sentence;
        currentTokens = estimateTokens(currentChunk);
      } else {
        currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        currentTokens += sentenceTokens;
      }
    }

    // Flush remaining chunk
    if (currentTokens >= minChunkTokens) {
      const chunk = this.createChunk(
        currentChunk,
        title,
        sourceUrl,
        sourceId,
        businessId,
        chunkIndex++,
        metadata,
        existingHashes
      );
      if (chunk) chunks.push(chunk);
    }

    // Update totalChunks for all chunks
    for (const chunk of chunks) {
      chunk.totalChunks = chunks.length;
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private splitByCharacters(text: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    const maxChars = maxTokens * 4; // approx 4 chars per token
    for (let i = 0; i < text.length; i += maxChars) {
      chunks.push(text.slice(i, i + maxChars).trim());
    }
    return chunks.filter((c) => c.length > 0);
  }

  private getOverlap(text: string, overlapTokens: number): string {
    if (!text || overlapTokens <= 0) return "";
    const overlapChars = overlapTokens * 4;
    if (text.length <= overlapChars) return text;
    return text.slice(text.length - overlapChars).trim();
  }

  private createChunk(
    content: string,
    title: string,
    sourceUrl: string | undefined,
    sourceId: string | undefined,
    businessId: string | undefined,
    chunkIndex: number,
    metadata: Record<string, unknown> | undefined,
    existingHashes: Set<string>
  ): ChunkOutput | null {
    const hash = hashContent(content);
    if (existingHashes.has(hash)) {
      return null;
    }
    existingHashes.add(hash);

    return {
      content,
      contentHash: hash,
      title,
      sourceUrl,
      sourceId,
      businessId,
      chunkIndex,
      totalChunks: 0, // updated later
      metadata: { ...(metadata ?? {}), charCount: content.length },
      tokenCount: estimateTokens(content),
    };
  }
}

export const textChunker = new TextChunker();
