import { redis } from "@/lib/redis";

const WINDOW_SEC = 3600;
const MAX_AUDITS_PER_INSTALL_PER_HOUR = 30;
const MAX_AUDITS_PER_PR_PER_HOUR = 8;

function keyInstall(installationId: string): string {
  return `ratelimit:install:${installationId}`;
}

function keyPr(owner: string, repo: string, pr: number): string {
  return `ratelimit:pr:${owner}/${repo}/${pr}`;
}

export type RateLimitResult = { ok: true } | { ok: false; reason: string; retryAfterSec?: number };

/**
 * Best-effort rate limits using INCR + TTL (Upstash REST).
 * If Redis fails, allow the request (fail open).
 */
export async function checkAuditRateLimits(params: {
  installationId?: string | number;
  owner: string;
  repo: string;
  prNumber: number;
}): Promise<RateLimitResult> {
  try {
    if (params.installationId != null) {
      const k = keyInstall(String(params.installationId));
      const n = await redis.incr(k);
      if (n === 1) {
        await redis.expire(k, WINDOW_SEC);
      }
      if (n > MAX_AUDITS_PER_INSTALL_PER_HOUR) {
        return {
          ok: false,
          reason: `Installation audit limit (${MAX_AUDITS_PER_INSTALL_PER_HOUR}/h) exceeded. Try again later.`,
          retryAfterSec: WINDOW_SEC,
        };
      }
    }

    const k2 = keyPr(params.owner, params.repo, params.prNumber);
    const n2 = await redis.incr(k2);
    if (n2 === 1) {
      await redis.expire(k2, WINDOW_SEC);
    }
    if (n2 > MAX_AUDITS_PER_PR_PER_HOUR) {
      return {
        ok: false,
        reason: `PR audit limit (${MAX_AUDITS_PER_PR_PER_HOUR}/h) exceeded for this pull request.`,
        retryAfterSec: WINDOW_SEC,
      };
    }

    return { ok: true };
  } catch {
    return { ok: true };
  }
}
