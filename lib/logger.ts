/**
 * Structured logs for audits and bot flows (grep-friendly in Vercel/runtime logs).
 */
export function logAudit(
  scope: "audit" | "bot" | "fix" | "rate-limit",
  message: string,
  ctx: Record<string, string | number | undefined>
): void {
  const payload = { scope, msg: message, ...ctx };
  console.log(JSON.stringify(payload));
}
