import { embed, embedMany } from "ai";
import { gateway } from "@ai-sdk/gateway";

export interface CodeChunk {
  fileId: number;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

const CHUNK_SIZE = 50; // lines per chunk
const CHUNK_OVERLAP = 10; // overlap between chunks

export function chunkFileContent(filePath: string, fileId: number, content: string): CodeChunk[] {
  const lines = content.split("\n");
  const chunks: CodeChunk[] = [];

  for (let start = 0; start < lines.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
    const end = Math.min(start + CHUNK_SIZE, lines.length);
    const chunkContent = lines.slice(start, end).join("\n");

    if (chunkContent.trim().length < 20) continue;

    chunks.push({
      fileId,
      filePath,
      startLine: start + 1,
      endLine: end,
      content: chunkContent,
    });

    if (end >= lines.length) break;
  }

  return chunks;
}

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const BATCH_SIZE = 96;

export async function embedChunks(chunks: CodeChunk[]): Promise<Float32Array[]> {
  const embeddings: Float32Array[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => `${c.filePath}\n${c.content}`);

    const result = await embedMany({
      model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
      values: texts,
    });

    for (const emb of result.embeddings) {
      embeddings.push(new Float32Array(emb));
    }
  }

  return embeddings;
}

export async function embedQuery(query: string): Promise<Float32Array> {
  const result = await embed({
    model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
    value: query,
  });
  return new Float32Array(result.embedding);
}
