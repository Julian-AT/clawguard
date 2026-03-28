import { createBashTool } from "bash-tool";
import type { AgentContext } from "@/lib/agents/types";
import { buildClawAgentTools } from "@/lib/tools/agent-tools";

/** Bash (read/write/shell) + ClawGuard custom tools for specialist agents */
export async function mergeBashAndClawTools(context: AgentContext) {
  const { tools: bashTools } = await createBashTool({ sandbox: context.sandbox });
  const claw = buildClawAgentTools(context.sandbox, context);
  return { ...bashTools, ...claw };
}
