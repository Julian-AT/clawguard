/**
 * Seeds Redis with one fake audit so the report page and dashboard showcase
 * full UI (findings, phases, threat model, PR summary, verdict, team patterns).
 *
 * Uses the same credentials as the Next.js app:
 *   KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV), or
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash console).
 *
 *   npx tsx scripts/seed-demo-audit.ts
 *
 * Primary URL: /report/demo (same audit payload).
 * Redis key route: /report/demo/clawguard-showcase/1
 * In `next dev`, the key route works without Redis via demo fallback when ENABLE_DEMO_AUDIT=1 or NODE_ENV=development.
 */

import { DEMO_AUDIT_KEY, getDemoAuditData } from "@/lib/demo-audit";
import { storeAuditResult } from "@/lib/redis";

function hasRedisRestEnv(): boolean {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

async function main(): Promise<void> {
  if (!hasRedisRestEnv()) {
    console.error(
      "Missing Redis REST env. Set KV_REST_API_URL + KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.",
    );
    process.exit(1);
  }

  await storeAuditResult({
    key: DEMO_AUDIT_KEY,
    data: getDemoAuditData(),
  });

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  console.log(`Stored demo audit at Redis key: ${DEMO_AUDIT_KEY}`);
  console.log(`Open: ${base}/report/demo  (or ${base}/report/demo/clawguard-showcase/1)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
