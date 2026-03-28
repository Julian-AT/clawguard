import type { CodeChunk } from "./embedder";

export interface IndexEntry {
  chunk: CodeChunk;
  embedding: Float32Array;
}

export interface SearchHit {
  chunk: CodeChunk;
  score: number;
}

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

  search(queryEmbedding: Float32Array, topK: number = 10): SearchHit[] {
    const scored: SearchHit[] = [];

    for (const entry of this.entries) {
      const score = cosineSimilarity(queryEmbedding, entry.embedding);
      scored.push({ chunk: entry.chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  clear(): void {
    this.entries = [];
  }
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
