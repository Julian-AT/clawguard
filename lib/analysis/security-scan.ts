import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { ToolSet } from "ai";
import type { ClawGuardConfig, PolicyRule } from "@/lib/config/schemas";
import { FindingSchema, type Finding, type ReconResult } from "./types";
import { z } from "zod";

const SecurityScanOutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

function policiesBlock(policies: PolicyRule[]): string {
  if (policies.length === 0) return "(No custom policies in .clawguard/policies.yml)";
  return policies
    .map(
      (p) =>
        `- [${p.severity}] ${p.name}: ${p.rule}`
    )
    .join("\n");
}

function reconContextBlock(recon: ReconResult): string {
  const excerpts = recon.fileExcerpts
    ? Object.entries(recon.fileExcerpts)
        .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
        .join("\n\n")
    : "(No file excerpts)";
  return [
    `Languages: ${recon.languages.join(", ") || "unknown"}`,
    `Package manager: ${recon.packageManager ?? "unknown"}`,
    `Framework hints: ${recon.frameworkHints.join(", ") || "none"}`,
    `Static analysis:\n${recon.staticAnalysisSnippet ?? "none"}`,
    `Changed files: ${recon.changedFiles.map((f) => f.path).join(", ")}`,
    excerpts,
  ].join("\n\n");
}

/**
 * Single deep security scan with recon + policy context.
 */
export async function runSecurityScan(
  tools: ToolSet,
  recon: ReconResult,
  policies: PolicyRule[],
  config: ClawGuardConfig,
  onStepFinish?: (info: { stepCount: number }) => void
): Promise<{ findings: Finding[]; summary: string }> {
  const modelRef = `${config.model.provider}/${config.model.model}`;
  let stepCount = 0;
  const agent = new ToolLoopAgent({
    model: gateway(modelRef),
    tools,
    output: Output.object({ schema: SecurityScanOutputSchema }),
    stopWhen: stepCountIs(config.model.maxSteps),
    instructions: [
      "You are a principal application security engineer.",
      "You receive repository reconnaissance (file excerpts, static analysis) and a PR diff.",
      "Find REAL security issues in the changed code. Prefer evidence from excerpts and diff.",
      "Enforce custom policies from the repository when listed.",
      "",
      "For each finding you MUST output:",
      "- severity, type, title, file, line, cweId, owaspCategory (OWASP Top 10 2021)",
      "- description, attackScenario, confidence",
      "- dataFlow with nodes (source/transform/sink) AND mermaidDiagram (valid Mermaid graph LR or TB)",
      "- fix with before/after snippets and explanation",
      "- complianceMapping when applicable",
      "- remediationEffort: trivial | small | medium | large",
      "",
      "Avoid duplicate issues. Ignore test-only noise unless policies require it.",
    ].join("\n"),
    onStepFinish: onStepFinish
      ? () => {
          stepCount += 1;
          onStepFinish({ stepCount });
        }
      : undefined,
  });

  const prompt = [
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

  try {
    const result = await agent.generate({
      prompt,
    });
    return {
      findings: result.output.findings,
      summary: result.output.summary,
    };
  } catch (error) {
    console.error("[security-scan] Agent error:", error);
    return {
      findings: [],
      summary:
        "Security scan could not produce structured output. Check logs and retry.",
    };
  }
}
