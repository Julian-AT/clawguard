import { gateway } from "@ai-sdk/gateway";
import type { ToolSet } from "ai";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import type { ClawGuardConfig } from "@/lib/config/schemas";
import {
  type Finding,
  FindingSchema,
  type ReconResult,
  type ThreatModel,
  ThreatModelSchema,
} from "./types";

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
  config: ClawGuardConfig,
): Promise<{ findings: Finding[]; threatModel: ThreatModel; summary: string }> {
  const modelRef = `${config.model.provider}/${config.model.model}`;
  const agent = new ToolLoopAgent({
    model: gateway(modelRef),
    tools,
    output: Output.object({ schema: ThreatSynthesisOutputSchema }),
    stopWhen: stepCountIs(Math.min(25, config.scanning.maxSteps)),
    instructions: [
      "You are a threat modeling lead. Merge and deduplicate findings, then produce a threat model.",
      "",
      "Tasks:",
      "1. Deduplicate findings that describe the same vulnerability (same file+area). Keep the strongest severity.",
      "2. Build attackSurfaces for new trust boundaries and entry points implied by the PR.",
      "3. Build attackPaths: each with name, mermaidDiagram (valid Mermaid), riskAssessment.",
      "4. Populate strideCategorization: STRIDE (S/T/R/I/D/E) labels tied to risks in this PR.",
      "5. Populate trustBoundaries where data crosses trust zones; optional Mermaid per boundary.",
      "6. Populate riskMatrix rows: likelihood × impact for top risks with topic + notes.",
      "7. Set overallRisk, mergeRecommendation (approve / request changes / block), compoundRiskSummary.",
      "8. Write executive summary (2-4 sentences) in `summary`.",
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
      strideCategorization: [],
      trustBoundaries: [],
      riskMatrix: [],
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
