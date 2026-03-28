import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import { FindingSchema, type Finding, type ReconResult } from "@/lib/analysis/types";
import type { PolicyRule } from "@/lib/config/schemas";
import type { SecurityAgentDefinition, AgentContext, AgentResult } from "@/lib/agents/types";
import { registerAgent } from "@/lib/agents/registry";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

function policiesBlock(policies: PolicyRule[]): string {
  if (policies.length === 0) return "(No custom policies in .clawguard/policies.yml)";
  return policies
    .map((p) => `- [${p.severity}] ${p.name}: ${p.rule}`)
    .join("\n");
}

function reconContextBlock(recon: ReconResult): string {
  const excerpts = recon.fileExcerpts
    ? Object.entries(recon.fileExcerpts)
        .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
        .join("\n\n")
    : "(No file excerpts)";

  const extra: string[] = [];
  if (recon.dependencyAuditSnippet) {
    extra.push(
      "## Dependency audit (npm/pnpm)\n```json\n" + recon.dependencyAuditSnippet + "\n```",
    );
  }
  if (recon.secretPatternHints?.length) {
    extra.push(
      "## Secret-pattern heuristics in diff\n" +
        recon.secretPatternHints.map((h) => `- ${h}`).join("\n"),
    );
  }
  if (recon.optionalSarifSnippet) {
    extra.push("## Semgrep SARIF excerpt\n```\n" + recon.optionalSarifSnippet + "\n```");
  }

  return [
    `Languages: ${recon.languages.join(", ") || "unknown"}`,
    `Package manager: ${recon.packageManager ?? "unknown"}`,
    `Framework hints: ${recon.frameworkHints.join(", ") || "none"}`,
    `Static analysis:\n${recon.staticAnalysisSnippet ?? "none"}`,
    `Changed files: ${recon.changedFiles.map((f) => f.path).join(", ")}`,
    excerpts,
    extra.join("\n\n"),
  ].join("\n\n");
}

function buildPrompt(recon: ReconResult, policies: PolicyRule[]): string {
  return [
    "## Custom policies",
    policiesBlock(policies),
    "",
    "## Reconnaissance",
    reconContextBlock(recon),
    "",
    "## Diff",
    "<diff>",
    recon.diff,
    "</diff>",
  ].join("\n");
}

const AGENT_NAME = "security-scan" as const;
const REQUIRED_SKILLS = ["owasp-web-security", "code-quality", "reporting"] as const;

const securityScanAgent: SecurityAgentDefinition = {
  name: AGENT_NAME,
  description:
    "Core vulnerability scanner: code-level security issues in the PR diff with policy alignment.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 30,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const depthHint =
      context.config.scanning.depth === "quick"
        ? "Keep analysis faster and slightly less exhaustive."
        : context.config.scanning.depth === "deep"
          ? "Be exhaustive; consider subtle and chained issues."
          : "";

    const baseInstructions = [
      ...(depthHint ? [depthHint] : []),
      "You are a principal application security engineer focused ONLY on code-level vulnerabilities in the changed code.",
      "Do not duplicate dependency-CVE, secret-leak, or pure infra misconfiguration work — other agents cover those.",
      "Use tools to read additional files in the sandbox only when the diff and excerpts are insufficient.",
      "Find REAL security issues. Prefer evidence from excerpts and diff.",
      "Enforce custom policies from the repository when listed.",
      "",
      "For each finding you MUST output:",
      "- severity, type, title, file, line, cweId, owaspCategory (OWASP Top 10 2021)",
      "- description, attackScenario, confidence",
      "- dataFlow with nodes (source/transform/sink) AND mermaidDiagram (valid Mermaid graph LR or TB) when applicable",
      "- fix with before/after snippets and explanation when you can suggest one",
      "- complianceMapping when applicable",
      "- remediationEffort: trivial | small | medium | large",
      "",
      "Avoid duplicate issues. Ignore test-only noise unless policies require it.",
    ].join("\n");

    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const { tools } = await createBashTool({ sandbox: context.sandbox });
    const prompt = buildPrompt(context.recon, context.policies);

    try {
      const loop = new ToolLoopAgent({
        model: gateway(modelRef),
        tools,
        output: Output.object({ schema: OutputSchema }),
        stopWhen: stepCountIs(30),
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

registerAgent(securityScanAgent);
