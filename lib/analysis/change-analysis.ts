import { gateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import type { ClawGuardConfig } from "@/lib/config/schemas";
import { type PRSummary, PRSummarySchema, type ReconResult } from "./types";

/**
 * High-level PR summary: narrative, Mermaid sequence diagrams, dependency impact, breaking changes.
 */
export async function runChangeAnalysis(
  recon: ReconResult,
  config: ClawGuardConfig,
): Promise<PRSummary> {
  if (!config.analysis.generatePRSummary) {
    return {
      narrative: "PR summary generation disabled in config.",
      sequenceDiagrams: [],
      dependencyImpact: [],
      breakingChanges: [],
      complexity: "small",
    };
  }

  const modelRef = `${config.model.provider}/${config.model.model}`;
  const depHint = recon.dependencyGraph
    ? JSON.stringify(recon.dependencyGraph, null, 2)
    : "(no dependency graph)";

  try {
    const { object } = await generateObject({
      model: gateway(modelRef),
      schema: PRSummarySchema,
      prompt: [
        "You are a senior engineer summarizing a pull request for reviewers.",
        "Produce a clear narrative (2-3 short paragraphs) of what the change does and why.",
        config.analysis.generateSequenceDiagrams
          ? "Include 1-3 Mermaid **sequenceDiagram** blocks in sequenceDiagrams where they clarify new request/response or async flows. Use short participant names."
          : "Leave sequenceDiagrams empty.",
        "dependencyImpact: list changed files and what depends on them (direct vs transitive) — infer from diff and context.",
        "breakingChanges: public API or contract breaks, if any; else empty array.",
        "complexity: trivial | small | medium | large | very-large based on scope.",
        "",
        "## Recon",
        `Languages: ${recon.languages.join(", ")}`,
        `Frameworks: ${recon.frameworkHints.join(", ")}`,
        `Changed files: ${recon.changedFiles.map((f) => f.path).join(", ")}`,
        "",
        "## Dependency / context",
        depHint,
        "",
        "## Diff (truncated)",
        recon.diff.slice(0, 100_000),
      ].join("\n"),
    });
    return object;
  } catch (e) {
    console.error("[change-analysis] generateObject failed:", e);
    return {
      narrative:
        "Could not generate a structured PR summary automatically. See the security findings and diff for details.",
      sequenceDiagrams: [],
      dependencyImpact: [],
      breakingChanges: [],
      complexity: "medium",
    };
  }
}
