import { redis } from "@/lib/redis";
import type { KnowledgeEntry } from "./types";
import { KnowledgeEntrySchema } from "./types";

function orgKey(owner: string): string {
  return `knowledge:org:${owner}`;
}

async function readList(key: string): Promise<KnowledgeEntry[]> {
  const raw = await redis.get<unknown>(key);
  if (!raw) return [];
  try {
    const parsed = raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => KnowledgeEntrySchema.safeParse(x))
      .filter((r) => r.success)
      .map((r) => r.data);
  } catch {
    return [];
  }
}

async function writeList(key: string, items: KnowledgeEntry[]): Promise<void> {
  await redis.set(key, items);
}

export async function listKnowledgeOrg(owner: string): Promise<KnowledgeEntry[]> {
  return readList(orgKey(owner));
}

export async function appendKnowledgeOrg(
  owner: string,
  entry: Omit<KnowledgeEntry, "id" | "createdAt"> & { id?: string },
): Promise<KnowledgeEntry> {
  const list = await listKnowledgeOrg(owner);
  const now = new Date().toISOString();
  const id = entry.id ?? `k_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row: KnowledgeEntry = {
    ...entry,
    id,
    createdAt: now,
  };
  list.push(row);
  await writeList(orgKey(owner), list);
  return row;
}

export function formatKnowledgeForPrompt(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";
  const lines = ["### Organization knowledge"];
  for (const e of entries.slice(0, 30)) {
    lines.push(`- [${e.category}] **${e.title}**: ${e.body.slice(0, 400)}`);
  }
  return lines.join("\n");
}
