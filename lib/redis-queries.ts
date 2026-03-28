import { redis } from "@/lib/redis";
import type { AuditData } from "@/lib/redis";

const KEY_PATTERN = /^([^/]+)\/([^/]+)\/pr\/(\d+)$/;

export interface RepoKey {
  owner: string;
  repo: string;
}

/**
 * List distinct owner/repo pairs that have at least one stored audit (SCAN).
 */
export async function listReposWithAudits(): Promise<RepoKey[]> {
  const keys: string[] = [];
  let cur: string | number = "0";
  for (;;) {
    const scanResult = (await redis.scan(cur, {
      match: "*/*/pr/*",
      count: 500,
    })) as [string, string[]];
    const nextCursor = scanResult[0];
    const batch = scanResult[1];
    keys.push(...batch);
    if (nextCursor === "0") break;
    cur = nextCursor;
  }

  const repos = new Map<string, RepoKey>();
  for (const key of keys) {
    const m = key.match(KEY_PATTERN);
    if (m) {
      repos.set(`${m[1]}/${m[2]}`, { owner: m[1], repo: m[2] });
    }
  }
  return [...repos.values()];
}

/**
 * All PR audit keys for a repository.
 */
export async function listPrAuditKeys(
  owner: string,
  repo: string
): Promise<string[]> {
  const prefix = `${owner}/${repo}/pr/`;
  const keys: string[] = [];
  let cur: string | number = "0";
  for (;;) {
    const scanResult = (await redis.scan(cur, {
      match: `${prefix}*`,
      count: 500,
    })) as [string, string[]];
    const nextCursor = scanResult[0];
    const batch = scanResult[1];
    keys.push(...batch);
    if (nextCursor === "0") break;
    cur = nextCursor;
  }
  return keys.sort();
}

export async function loadAuditDataForKeys(
  keys: string[]
): Promise<Array<{ key: string; data: AuditData }>> {
  const out: Array<{ key: string; data: AuditData }> = [];
  for (const key of keys) {
    const raw = await redis.get<string>(key);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as AuditData;
      out.push({ key, data });
    } catch {
      // skip
    }
  }
  return out;
}
