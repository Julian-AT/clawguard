import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface AuditData {
  result: string;
  timestamp: string;
  pr: { owner: string; repo: string; number: number; title: string };
  status: "processing" | "complete" | "error";
}

export async function storeAuditResult(params: {
  key: string;
  data: AuditData;
}): Promise<void> {
  await redis.set(params.key, JSON.stringify(params.data));
}

export async function getAuditResult(key: string): Promise<AuditData | null> {
  const raw = await redis.get<string>(key);
  return raw ? JSON.parse(raw) : null;
}
