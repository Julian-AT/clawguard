export type LogScope = "audit" | "bot" | "fix" | "rate-limit" | "agent" | "tool" | "rag";

export function logAudit(
  scope: LogScope,
  message: string,
  ctx: Record<string, string | number | undefined>
): void {
  const payload: Record<string, unknown> = { scope, msg: message, ts: Date.now() };
  for (const [k, v] of Object.entries(ctx)) {
    if (v !== undefined) payload[k] = v;
  }
  console.log(JSON.stringify(payload));
}

export function logWarn(
  scope: LogScope,
  message: string,
  ctx: Record<string, string | number | undefined> = {}
): void {
  const payload: Record<string, unknown> = {
    scope,
    level: "warn",
    msg: message,
    ts: Date.now(),
  };
  for (const [k, v] of Object.entries(ctx)) {
    if (v !== undefined) payload[k] = v;
  }
  console.warn(JSON.stringify(payload));
}
