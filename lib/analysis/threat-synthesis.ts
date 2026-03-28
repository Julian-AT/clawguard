import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { ToolSet } from "ai";
import type { ClawGuardConfig } from "@/lib/config/schemas";
import {
  FindingSchema,
  ThreatModelSchema,
  type Finding,
  type ReconResult,
  type ThreatModel,
} from "./types";
import { z } from "zod";

const ThreatSynthesisOutputSchema = z.object({
  findings: z.array(FindingSchema),
  threatModel: ThreatModelSchema,
  summary: z.string(),
});

/**
 * Threat modeling + deduplication + executive summary.
 */
export async function runThreatSynthesis(
  tools: ToolSet,
  recon: ReconResult,
  initialFindings: Finding[],
  securityScanSummary: string,
  config: ClawGuardConfig
): Promise<{ findings: Finding[]; threatModel: ThreatModel; summary: string }> {
  const modelRef = `${config.model.provider}/${config.model.model}`;
  const agent = new ToolLoopAgent({
    model: gateway(modelRef),
    tools,
    output: Output.object({ schema: ThreatSynthesisOutputSchema }),
    stopWhen: stepCountIs(Math.min(25, config.model.maxSteps)),
    instructions: [
      "You are a threat modeling lead. Merge and deduplicate findings, then produce a threat model.",
      "",
      "Tasks:",
      "1. Deduplicate findings that describe the same vulnerability (same file+area). Keep the strongest severity.",
      "2. Build attackSurfaces for new trust boundaries and entry points implied by the PR.",
      "3. Build attackPaths: each with name, mermaidDiagram (valid Mermaid), riskAssessment.",
      "4. Set overallRisk, mergeRecommendation (approve / request changes / block), compoundRiskSummary.",
      "5. Write executive summary (2-4 sentences) in `summary`.",
      "",
      "Mermaid diagrams must be dark-theme friendly (short labels, no HTML).",
    ].join("\n"),
  });

  const findingsJson = JSON.stringify(initialFindings, null, 2);

  const prompt = [
    "## Security scan summary",
    securityScanSummary,
    "",
    "## Initial findings (JSON)",
    findingsJson,
    "",
    "## Recon summary",
    `Languages: ${recon.languages.join(", ")}`,
    `Frameworks: ${recon.frameworkHints.join(", ")}`,
    "",
    "## Diff (reference)",
    recon.diff.slice(0, 120_000),
  ].join("\n");

  try {
    const result = await agent.generate({ prompt });
    return {
      findings: result.output.findings,
      threatModel: result.output.threatModel,
      summary: result.output.summary,
    };
  } catch (error) {
    console.error("[threat-synthesis] Agent error:", error);
    const fallback: ThreatModel = {
      attackSurfaces: [],
      attackPaths: [],
      overallRisk: "Unknown (threat synthesis failed)",
      mergeRecommendation: "Review findings manually.",
      compoundRiskSummary: "Could not compute compound risk.",
    };
    return {
      findings: initialFindings,
      threatModel: fallback,
      summary:
        initialFindings.length > 0
          ? `Found ${initialFindings.length} issue(s). Threat synthesis unavailable — showing raw scan results.`
          : "Threat synthesis could not produce structured output.",
    };
  }
}
