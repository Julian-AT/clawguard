/**
 * Derive a short human-readable line from the last tool call in a step (bash/read/write).
 */
export function detailFromToolCalls(
  toolCalls: Array<{ toolName?: string; input?: unknown }>
): string | undefined {
  if (!toolCalls?.length) return undefined;
  const last = toolCalls[toolCalls.length - 1];
  const name = String(last.toolName ?? "tool");
  const input = last.input;
  if (!input || typeof input !== "object") {
    return name;
  }
  const rec = input as Record<string, unknown>;
  const cmd =
    typeof rec.command === "string"
      ? rec.command
      : typeof rec.path === "string"
        ? `read ${rec.path}`
        : undefined;
  if (cmd) {
    const trimmed = cmd.length > 120 ? `${cmd.slice(0, 117)}…` : cmd;
    return `${name}: ${trimmed}`;
  }
  return name;
}
