import { redis } from "@/lib/redis";

const RUNNING_PREFIX = "audit:running:";
const COOLDOWN_PREFIX = "audit:cooldown:";

function auditRunningKey(owner: string, repo: string, prNumber: number, headSha: string): string {
  return `${RUNNING_PREFIX}${owner}/${repo}/${prNumber}:${headSha}`;
}

/**
 * Try to acquire a per-PR+SHA lock so we do not run two audits for the same head concurrently.
 * Returns true if lock acquired.
 */
export async function tryAcquireAuditLock(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  ttlSeconds: number,
): Promise<boolean> {
  const key = auditRunningKey(owner, repo, prNumber, headSha);
  const ok = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
  return Boolean(ok);
}

/**
 * Set cooldown after an auto-trigger audit completes so rapid duplicate events are ignored.
 */
export async function setAuditCooldown(
  owner: string,
  repo: string,
  prNumber: number,
  cooldownSeconds: number,
): Promise<void> {
  if (cooldownSeconds <= 0) return;
  const key = `${COOLDOWN_PREFIX}${owner}/${repo}/${prNumber}`;
  await redis.set(key, Date.now().toString(), { ex: cooldownSeconds });
}

/**
 * Returns true if cooldown is active (should skip new auto audit).
 */
export async function isAuditCooldownActive(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<boolean> {
  const key = `${COOLDOWN_PREFIX}${owner}/${repo}/${prNumber}`;
  const v = await redis.get(key);
  return v != null;
}

export { auditRunningKey };

export async function releaseAuditLock(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
): Promise<void> {
  await redis.del(auditRunningKey(owner, repo, prNumber, headSha));
}
