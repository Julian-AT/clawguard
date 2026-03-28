import type { ClawGuardConfig } from "@/lib/config/schemas";
import { formatKnowledgeForPrompt, listKnowledgeOrg } from "./store";

export async function getKnowledgeBlockForScan(
  owner: string,
  config: ClawGuardConfig,
): Promise<string> {
  if (!config.learnings.enabled || !config.learnings.allowOrgInheritance) {
    return "";
  }
  const entries = await listKnowledgeOrg(owner);
  const block = formatKnowledgeForPrompt(entries);
  if (!block) return "";
  return ["## Architectural & team knowledge", block, ""].join("\n");
}
