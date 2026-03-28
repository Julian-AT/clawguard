import type { Sandbox } from "@vercel/sandbox";
import { logAudit } from "@/lib/logger";
import type { CodeChunk } from "./embedder";
import { chunkFileContent, embedChunks, embedQuery } from "./embedder";
import { type SearchHit, VectorIndex } from "./index";

const SKIP_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".lock",
  ".min.js",
  ".min.css",
  ".map",
]);

let cachedIndex: VectorIndex | null = null;
let cachedSandboxKey: string | null = null;

export async function buildRAGIndex(sandbox: Sandbox): Promise<VectorIndex> {
  const sandboxKey = sandbox.sandboxId ?? String(sandbox);
  if (cachedIndex && cachedSandboxKey === sandboxKey) {
    return cachedIndex;
  }

  const index = new VectorIndex();

  const result = await sandbox.runCommand("find", [
    ".",
    "-type",
    "f",
    "-not",
    "-path",
    "*/node_modules/*",
    "-not",
    "-path",
    "*/.git/*",
    "-not",
    "-path",
    "*/.next/*",
  ]);
  const stdout = await result.stdout();
  const paths = stdout.split("\n").filter((p) => {
    if (!p || p === ".") return false;
    const ext = p.slice(p.lastIndexOf("."));
    return !SKIP_EXTENSIONS.has(ext);
  });

  const allChunks: CodeChunk[] = [];
  let fileId = 0;

  for (const path of paths.slice(0, 5_000)) {
    const cleanPath = path.startsWith("./") ? path.slice(2) : path;
    try {
      const buf = await sandbox.readFileToBuffer({ path: cleanPath });
      if (!buf || buf.length > 500_000) continue;
      const text = buf.toString("utf-8");
      const chunks = chunkFileContent(cleanPath, fileId++, text);
      allChunks.push(...chunks);
    } catch {}
  }

  if (allChunks.length === 0) {
    cachedIndex = index;
    cachedSandboxKey = sandboxKey;
    return index;
  }

  const embeddings = await embedChunks(allChunks);
  index.addBatch(allChunks, embeddings);

  logAudit("rag", "index_built", {
    files: fileId,
    chunks: allChunks.length,
  });

  cachedIndex = index;
  cachedSandboxKey = sandboxKey;
  return index;
}

export async function retrieveContext(
  sandbox: Sandbox,
  query: string,
  topK: number = 10,
): Promise<SearchHit[]> {
  const index = await buildRAGIndex(sandbox);
  const queryEmb = await embedQuery(query);
  return index.search(queryEmb, topK);
}
