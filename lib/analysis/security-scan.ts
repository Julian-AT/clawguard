import { gateway } from "@ai-sdk/gateway";
import type { ToolSet } from "ai";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import type { ClawGuardConfig, PolicyRule } from "@/lib/config/schemas";
import { buildSecurityScanPrompt } from "./recon-context";
import { detailFromToolCalls } from "./step-detail";
import { type Finding, FindingSchema, type ReconResult } from "./types";

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

async function runScanOnce(
  tools: ToolSet,
  prompt: string,
  config: ClawGuardConfig,
  instructions: string,
  onStep?: (info: SecurityScanStepInfo) => void,
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
            detailFromToolCalls(event.toolCalls as Array<{ toolName?: string; input?: unknown }>) ??
            `Agent step ${stepCount}`;
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
  extras?: { learningsBlock?: string; knowledgeBlock?: string },
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

  const prompt = buildSecurityScanPrompt(recon, policies, {
    learnings: extras?.learningsBlock,
    knowledge: extras?.knowledgeBlock,
  });

  try {
    const out = await runScanOnce(tools, prompt, config, fullInstructions, onStepFinish);
    return {
      findings: out.findings,
      summary: out.summary,
      partialFailure: false,
    };
  } catch (firstError) {
    console.error("[security-scan] Agent error (first attempt):", firstError);
    if (config.scanning.maxRetries <= 0) {
      const msg = firstError instanceof Error ? firstError.message : String(firstError);
      return {
        findings: [],
        summary:
          "Security scan could not produce structured output. Check deployment logs or try again.",
        partialFailure: true,
        scanErrorMessage: msg,
      };
    }
    try {
      const out = await runScanOnce(tools, prompt, config, shortInstructions, onStepFinish);
      return {
        findings: out.findings,
        summary: out.summary,
        partialFailure: true,
        scanErrorMessage: `First scan attempt failed; retry produced results. (${firstError instanceof Error ? firstError.message : String(firstError)})`,
      };
    } catch (secondError) {
      console.error("[security-scan] Agent error (retry):", secondError);
      const msg = secondError instanceof Error ? secondError.message : String(secondError);
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
