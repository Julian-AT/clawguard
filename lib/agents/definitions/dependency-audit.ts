import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import { registerAgent } from "@/lib/agents/registry";
import type { AgentContext, AgentResult, SecurityAgentDefinition } from "@/lib/agents/types";
import { type Finding, FindingSchema } from "@/lib/analysis/types";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

const AGENT_NAME = "dependency-audit" as const;
const REQUIRED_SKILLS = ["dependency-audit"] as const;

function buildPrompt(context: AgentContext): string {
  const pm = context.recon.packageManager ?? "npm";
  const lockHints = context.recon.changedFiles
    .map((f) => f.path)
    .filter(
      (p) =>
        p.endsWith("package-lock.json") ||
        p.endsWith("pnpm-lock.yaml") ||
        p.endsWith("yarn.lock") ||
        p === "package.json",
    )
    .join(", ");

  return [
    "## Task",
    "Use shell tools in the sandbox repository root to gather dependency evidence, then reason about risk.",
    "",
    "## Commands (adapt to package manager)",
    `- Declared package manager hint: ${pm}`,
    "- Prefer: `npm audit --json` when package-lock.json exists; otherwise `pnpm audit --json` or `yarn npm audit --json` as appropriate.",
    "- Read the lockfile: e.g. `cat package-lock.json` head/limit if huge, or equivalent for pnpm/yarn.",
    "- If no lockfile, note that in the summary and still inspect package.json.",
    "",
    "## Scope",
    "Emit findings ONLY for: known CVEs from audit output, clearly outdated critical deps with security impact, license issues that create compliance or distribution risk (e.g. GPL in a proprietary product), or missing integrity metadata when relevant.",
    "Do NOT re-report generic application bugs unless tied to a vulnerable dependency version.",
    "",
    "## Recon hints",
    `Changed manifest/lock paths: ${lockHints || "(none flagged)"}`,
    context.recon.dependencyAuditSnippet
      ? "## Pre-collected audit snippet (may be truncated)\n```json\n" +
        context.recon.dependencyAuditSnippet +
        "\n```"
      : "",
    "",
    "## Diff (for context only)",
    "<diff>",
    context.recon.diff.slice(0, 120_000),
    "</diff>",
  ]
    .filter(Boolean)
    .join("\n");
}

const dependencyAuditAgent: SecurityAgentDefinition = {
  name: AGENT_NAME,
  description:
    "Runs package audit and lockfile review; LLM interprets CVEs, outdated deps, and license risk.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 15,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;

    const baseInstructions = [
      "You are a supply-chain and dependency security specialist.",
      "Ground every finding in tool output (audit JSON, lockfile contents). Cite package names and versions.",
      "For each finding: severity, type, title, file (e.g. package.json or lockfile path), line (use 1 if file-level), cweId when applicable (e.g. CWE-1104 for vulnerable components), owaspCategory (often A06:2021 Vulnerable and Outdated Components).",
      "Include attackScenario describing how the vulnerable dependency could be reached at runtime if applicable.",
      "If audit is clean and licenses are acceptable, return an empty findings array and a short positive summary.",
    ].join("\n");

    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const { tools } = await createBashTool({ sandbox: context.sandbox });
    const prompt = buildPrompt(context);

    try {
      const loop = new ToolLoopAgent({
        model: gateway(modelRef),
        tools,
        output: Output.object({ schema: OutputSchema }),
        stopWhen: stepCountIs(15),
        instructions,
      });

      const result = await loop.generate({
        prompt,
        abortSignal: context.abortSignal,
      });

      return {
        agentName: AGENT_NAME,
        findings: result.output.findings as Finding[],
        summary: result.output.summary,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        agentName: AGENT_NAME,
        findings: [],
        summary: `Agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(dependencyAuditAgent);
