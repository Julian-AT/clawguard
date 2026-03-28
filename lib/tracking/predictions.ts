import type { Finding } from "@/lib/analysis/types";
import { redis } from "@/lib/redis";

export interface StoredPrediction {
  headSha: string;
  recordedAt: string;
  fingerprints: Array<{
    type: string;
    file: string;
    line: number;
    severity: string;
  }>;
}

export async function storeAuditPredictions(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  findings: Finding[],
): Promise<void> {
  const key = `predictions:${owner}/${repo}/pr/${prNumber}`;
  const payload: StoredPrediction = {
    headSha,
    recordedAt: new Date().toISOString(),
    fingerprints: findings.map((f) => ({
      type: f.type,
      file: f.file,
      line: f.line,
      severity: f.severity,
    })),
  };
  await redis.set(key, JSON.stringify(payload));
}

export async function getPredictions(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<StoredPrediction | null> {
  const key = `predictions:${owner}/${repo}/pr/${prNumber}`;
  const raw = await redis.get<string>(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPrediction;
  } catch {
    return null;
  }
}
