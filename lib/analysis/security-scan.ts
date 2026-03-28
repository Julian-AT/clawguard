import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { ToolSet } from "ai";
import type { ClawGuardConfig, PolicyRule } from "@/lib/config/schemas";
import { FindingSchema, type Finding, type ReconResult } from "./types";
import { z } from "zod";
import { detailFromToolCalls } from "./step-detail";

const SecurityScanOutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

export type SecurityScanStepInfo = {
  stepCount: number;
  detail?: string;
};

export type SecurityScanResult = {
  findings: Finding[];
  summary: string;
  /** True when the agent threw or output was invalid after retry */
  partialFailure: boolean;
  scanErrorMessage?: string;
};

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

  const extra: string[] = [];
  if (recon.dependencyAuditSnippet) {
    extra.push("## Dependency audit (npm/pnpm)\n```json\n" + recon.dependencyAuditSnippet + "\n```");
  }
  if (recon.secretPatternHints?.length) {
    extra.push(
      "## Secret-pattern heuristics in diff\n" +
        recon.secretPatternHints.map((h) => `- ${h}`).join("\n")
    );
  }
  if (recon.optionalSarifSnippet) {
    extra.push("## Semgrep SARIF excerpt\n```\n" + recon.optionalSarifSnippet + "\n```");
  }
  if (recon.dependencyGraph) {
    extra.push(
      "## Dependency graph (imports, env, sensitive APIs)\n```json\n" +
        JSON.stringify(recon.dependencyGraph, null, 2).slice(0, 32_000) +
        "\n```"
    );
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

function buildPrompt(
  recon: ReconResult,
  policies: PolicyRule[],
  extras?: { learnings?: string; knowledge?: string }
): string {
  const parts = [
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
  ];
  if (extras?.learnings) parts.push("", extras.learnings);
  if (extras?.knowledge) parts.push("", extras.knowledge);
  return parts.join("\n");
}

async function runScanOnce(
  tools: ToolSet,
  prompt: string,
  config: ClawGuardConfig,
  instructions: string,
  onStep?: (info: SecurityScanStepInfo) => void
): Promise<{ findings: Finding[]; summary: string }> {
  const modelRef = `${config.model.provider}/${config.model.model}`;
  let stepCount = 0;
  const agent = new ToolLoopAgent({
    model: gateway(modelRef),
    tools,
    output: Output.object({ schema: SecurityScanOutputSchema }),
    stopWhen: stepCountIs(config.scanning.maxSteps),
    instructions,
    onStepFinish: onStep
      ? (event) => {
          stepCount += 1;
          const detail =
            detailFromToolCalls(
              event.toolCalls as Array<{ toolName?: string; input?: unknown }>
            ) ?? `Agent step ${stepCount}`;
          onStep({ stepCount, detail });
        }
      : undefined,
  });

  const result = await agent.generate({ prompt });
  return {
    findings: result.output.findings,
    summary: result.output.summary,
  };
}

export async function runSecurityScan(
  tools: ToolSet,
  recon: ReconResult,
  policies: PolicyRule[],
  config: ClawGuardConfig,
  onStepFinish?: (info: SecurityScanStepInfo) => void,
  extras?: { learningsBlock?: string; knowledgeBlock?: string }
): Promise<SecurityScanResult> {
  const depthHint =
    config.scanning.depth === "quick"
      ? "Keep analysis faster and slightly less exhaustive."
      : config.scanning.depth === "deep"
        ? "Be exhaustive; consider subtle and chained issues."
        : "";

  const fullInstructions = [
    ...(depthHint ? [depthHint] : []),
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
    "- strideCategory (optional): S|T|R|I|D|E when the issue maps clearly to STRIDE",
    "",
    "Avoid duplicate issues. Ignore test-only noise unless policies require it.",
  ].join("\n");

  const shortInstructions = [
    "You are a security engineer. Output ONLY valid JSON matching the schema.",
    "List security issues in the PR diff with file paths and line numbers from the changed code.",
    "Be concise; include CWE and OWASP category per finding.",
  ].join("\n");

  const prompt = buildPrompt(recon, policies, {
    learnings: extras?.learningsBlock,
    knowledge: extras?.knowledgeBlock,
  });

  try {
    const out = await runScanOnce(
      tools,
      prompt,
      config,
      fullInstructions,
      onStepFinish
    );
    return {
      findings: out.findings,
      summary: out.summary,
      partialFailure: false,
    };
  } catch (firstError) {
    console.error("[security-scan] Agent error (first attempt):", firstError);
    if (config.scanning.maxRetries <= 0) {
      const msg =
        firstError instanceof Error ? firstError.message : String(firstError);
      return {
        findings: [],
        summary:
          "Security scan could not produce structured output. Check deployment logs or try again.",
        partialFailure: true,
        scanErrorMessage: msg,
      };
    }
    try {
      const out = await runScanOnce(
        tools,
        prompt,
        config,
        shortInstructions,
        onStepFinish
      );
      return {
        findings: out.findings,
        summary: out.summary,
        partialFailure: true,
        scanErrorMessage: `First scan attempt failed; retry produced results. (${firstError instanceof Error ? firstError.message : String(firstError)})`,
      };
    } catch (secondError) {
      console.error("[security-scan] Agent error (retry):", secondError);
      const msg =
        secondError instanceof Error ? secondError.message : String(secondError);
      return {
        findings: [],
        summary:
          "Security scan could not produce structured output after retry. Check deployment logs or try again.",
        partialFailure: true,
        scanErrorMessage: msg,
      };
    }
  }
}
