import type { SkillDefinition } from "@/lib/skills/types";

export const orchestration: SkillDefinition = {
  id: "orchestration",
  name: "Multi-Agent Orchestration",
  domain: "orchestration",
  applicableTo: ["orchestrator"],
  priority: 1,
  content: `Decompose the security review into parallel workstreams after shared recon is available. Each specialist agent consumes the same recon baseline (file tree, entry points, dependency summary) and produces an independent finding list—no sequential gate unless output of one agent is strictly required input for another.

Merging: When combining results, deduplicate by (file path, line or line range, finding type/title). If duplicates differ in severity, keep the highest severity and merge evidence paragraphs. Preserve agent attribution internally for debugging.

Threat synthesis: After merge, produce a short narrative of cross-cutting themes (e.g. "missing authz on admin APIs" + "IDOR on user objects") only when supported by multiple concrete findings.

Resilience: If an agent fails (timeout, tool error), continue remaining agents; mark the run as partial in metadata and list which agents failed. Do not drop successful agents' output.

Metrics: Track count of findings per agent and per severity band for quality trends; flag zero-finding agents when scope suggests they should have produced signal (may warrant rerun with narrower task).`,
};
