import { Redis } from "@upstash/redis";
import type { AuditData } from "@/lib/audit-data";

export type { AuditData } from "@/lib/audit-data";

/** Vercel KV uses `KV_*`; Upstash console uses `UPSTASH_REDIS_REST_*`. */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

export async function storeAuditResult(params: { key: string; data: AuditData }): Promise<void> {
  await redis.set(params.key, params.data);
}

export async function getAuditResult(key: string): Promise<AuditData | null> {
  const { DEMO_AUDIT_KEY, getDemoAuditData } = await import("@/lib/demo-audit");
  const allowDemoFallback =
    key === DEMO_AUDIT_KEY &&
    (process.env.NODE_ENV === "development" || process.env.ENABLE_DEMO_AUDIT === "1");

  try {
    const data = await redis.get<AuditData>(key);
    if (data) return data;
  } catch {
    if (!allowDemoFallback) return null;
    return getDemoAuditData();
  }

  if (allowDemoFallback) {
    return getDemoAuditData();
  }
  return null;
}
