import { detailFromToolCalls } from "@/lib/analysis/step-detail";
import type { AgentContext } from "./types";

export function summarizeToolInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const rec = input as Record<string, unknown>;
  if (typeof rec.command === "string") {
    const c = rec.command;
    return c.length > 120 ? `${c.slice(0, 117)}…` : c;
  }
  if (typeof rec.path === "string") return rec.path.slice(0, 120);
  if (typeof rec.pattern === "string") return rec.pattern.slice(0, 120);
  if (typeof rec.query === "string") return rec.query.slice(0, 120);
  return "";
}

/**
 * ToolLoopAgent onStepFinish: progress + optional SSE tool:called / tool:result.
 */
export function createOnStepFinish(agentName: string, context: AgentContext) {
  let stepCount = 0;
  return (event: { toolCalls?: Array<{ toolName?: string; input?: unknown }> }) => {
    stepCount += 1;
    const detail =
      detailFromToolCalls((event.toolCalls ?? []) as Array<{ toolName?: string; input?: unknown }>) ??
      `step ${stepCount}`;
    context.onAgentStep?.({ agentName, stepCount, detail });
    context.onStreamEvent?.("agent:step", { agentName, stepCount, detail });
    const last = event.toolCalls?.[event.toolCalls.length - 1];
    if (!last || !context.onStreamEvent) return;
    const toolName = String(last.toolName ?? "tool");
    const inputSummary = summarizeToolInput(last.input) || detail;
    const t0 = Date.now();
    context.onStreamEvent("tool:called", {
      toolName,
      agentName,
      inputSummary,
    });
    context.onStreamEvent("tool:result", {
      toolName,
      agentName,
      success: true,
      durationMs: Date.now() - t0,
    });
  };
}
