import { redis } from "@/lib/redis";
import type { Learning } from "./types";
import { LearningSchema } from "./types";

function repoKey(owner: string, repo: string): string {
  return `learnings:${owner}/${repo}`;
}

function orgKey(owner: string): string {
  return `learnings:org:${owner}`;
}

async function readList(key: string): Promise<Learning[]> {
  const raw = await redis.get<string>(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => LearningSchema.safeParse(x))
      .filter((r) => r.success)
      .map((r) => r.data);
  } catch {
    return [];
  }
}

async function writeList(key: string, items: Learning[]): Promise<void> {
  await redis.set(key, JSON.stringify(items));
}

export async function listLearningsRepo(
  owner: string,
  repo: string
): Promise<Learning[]> {
  return readList(repoKey(owner, repo));
}

export async function listLearningsOrg(owner: string): Promise<Learning[]> {
  return readList(orgKey(owner));
}

export async function appendLearningRepo(
  owner: string,
  repo: string,
  learning: Omit<Learning, "id" | "createdAt" | "updatedAt" | "upvotes"> & {
    id?: string;
  }
): Promise<Learning> {
  const list = await listLearningsRepo(owner, repo);
  const now = new Date().toISOString();
  const id = learning.id ?? `l_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row: Learning = {
    ...learning,
    id,
    upvotes: 0,
    createdAt: now,
    updatedAt: now,
  };
  list.push(row);
  await writeList(repoKey(owner, repo), list);
  return row;
}

export async function promoteLearningToOrg(
  owner: string,
  learning: Learning
): Promise<void> {
  const list = await listLearningsOrg(owner);
  if (list.some((l) => l.id === learning.id)) return;
  list.push(learning);
  await writeList(orgKey(owner), list);
}

export function formatLearningsForPrompt(
  repoLearnings: Learning[],
  orgLearnings: Learning[]
): string {
  const lines: string[] = [];
  if (orgLearnings.length > 0) {
    lines.push("### Organization learnings");
    for (const l of orgLearnings.slice(0, 40)) {
      lines.push(
        `- [${l.action}] ${l.pattern} — ${l.context} (confidence ${l.confidence})`
      );
    }
  }
  if (repoLearnings.length > 0) {
    lines.push("### Repository learnings");
    for (const l of repoLearnings.slice(0, 40)) {
      lines.push(
        `- [${l.action}] ${l.pattern} — ${l.context} (confidence ${l.confidence})`
      );
    }
  }
  return lines.length > 0 ? lines.join("\n") : "";
}
