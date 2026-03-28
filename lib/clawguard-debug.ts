/** Set CLAWGUARD_DEBUG_WEBHOOK=0 to silence. Default: on in development, off in production unless explicitly enabled. */
export function clawguardWebhookDebug(...args: unknown[]): void {
  if (process.env.CLAWGUARD_DEBUG_WEBHOOK === "0") {
    return;
  }
  if (process.env.NODE_ENV === "production" && process.env.CLAWGUARD_DEBUG_WEBHOOK !== "1") {
    return;
  }
  console.log("[clawguard-debug]", ...args);
}
