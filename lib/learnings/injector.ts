import type { ClawGuardConfig } from "@/lib/config/schemas";
import { formatLearningsForPrompt, listLearningsOrg, listLearningsRepo } from "./store";

export async function getLearningsBlockForScan(
  owner: string,
  repo: string,
  config: ClawGuardConfig,
): Promise<string> {
  if (!config.learnings.enabled) return "";
  const repoL = await listLearningsRepo(owner, repo);
  const orgL = config.learnings.allowOrgInheritance ? await listLearningsOrg(owner) : [];
  const block = formatLearningsForPrompt(repoL, orgL);
  if (!block) return "";
  return ["## Team learnings (honor these when consistent with evidence)", block, ""].join("\n");
}
