import { redis } from "@/lib/redis";

const METRICS_PREFIX = "tracking:metrics:";

export interface TrackingMetrics {
  truePositives: number;
  falsePositives: number;
  misses: number;
  lastUpdated: string;
}

export async function recordTruePositive(owner: string, repo: string): Promise<void> {
  const key = `${METRICS_PREFIX}${owner}/${repo}`;
  const m = await readMetrics(owner, repo);
  m.truePositives += 1;
  m.lastUpdated = new Date().toISOString();
  await redis.set(key, JSON.stringify(m));
}

export async function recordFalsePositive(owner: string, repo: string): Promise<void> {
  const key = `${METRICS_PREFIX}${owner}/${repo}`;
  const m = await readMetrics(owner, repo);
  m.falsePositives += 1;
  m.lastUpdated = new Date().toISOString();
  await redis.set(key, JSON.stringify(m));
}

export async function readMetrics(owner: string, repo: string): Promise<TrackingMetrics> {
  const key = `${METRICS_PREFIX}${owner}/${repo}`;
  const raw = await redis.get<string>(key);
  if (!raw) {
    return {
      truePositives: 0,
      falsePositives: 0,
      misses: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
  try {
    return JSON.parse(raw) as TrackingMetrics;
  } catch {
    return {
      truePositives: 0,
      falsePositives: 0,
      misses: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}
