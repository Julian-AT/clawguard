import type { CodeChunk } from "./embedder";

export interface IndexEntry {
  chunk: CodeChunk;
  embedding: Float32Array;
}

export interface SearchHit {
  chunk: CodeChunk;
  score: number;
}

/** Dimensions used for coarse dot-product pre-ranking (ANN-style pruning). */
const COARSE_DIM = 64;
const CANDIDATE_MULTIPLIER = 24;

export class VectorIndex {
  private entries: IndexEntry[] = [];

  get size(): number {
    return this.entries.length;
  }

  add(chunk: CodeChunk, embedding: Float32Array): void {
    this.entries.push({ chunk, embedding });
  }

  addBatch(chunks: CodeChunk[], embeddings: Float32Array[]): void {
    for (let i = 0; i < chunks.length; i++) {
      this.entries.push({ chunk: chunks[i], embedding: embeddings[i] });
    }
  }

  /**
   * Approximate nearest-neighbor style search: coarse partial dot-product on first
   * `COARSE_DIM` dimensions, then full cosine similarity on the top candidates only.
   */
  search(queryEmbedding: Float32Array, topK: number = 10): SearchHit[] {
    if (this.entries.length === 0) return [];

    if (this.entries.length <= topK * 2) {
      return fullCosineSearch(this.entries, queryEmbedding, topK);
    }

    const coarse: Array<{ entry: IndexEntry; partial: number }> = [];
    for (const entry of this.entries) {
      coarse.push({
        entry,
        partial: partialDot(queryEmbedding, entry.embedding, COARSE_DIM),
      });
    }
    coarse.sort((a, b) => b.partial - a.partial);
    const candidateCount = Math.min(
      this.entries.length,
      Math.max(topK * CANDIDATE_MULTIPLIER, topK * 4, 64),
    );
    const candidates = coarse.slice(0, candidateCount).map((c) => c.entry);
    return fullCosineSearch(candidates, queryEmbedding, topK);
  }

  clear(): void {
    this.entries = [];
  }
}

function partialDot(a: Float32Array, b: Float32Array, dims: number): number {
  const n = Math.min(dims, a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

function fullCosineSearch(
  entries: IndexEntry[],
  queryEmbedding: Float32Array,
  topK: number,
): SearchHit[] {
  const scored: SearchHit[] = [];
  for (const entry of entries) {
    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    scored.push({ chunk: entry.chunk, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
