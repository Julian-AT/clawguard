import type { PolicyRule } from "@/lib/config/schemas";
import type { ReconResult } from "./types";

export function policiesBlockForScan(policies: PolicyRule[]): string {
  if (policies.length === 0) return "(No custom policies in .clawguard/policies.yml)";
  return policies.map((p) => `- [${p.severity}] ${p.name}: ${p.rule}`).join("\n");
}

/** Shared recon text for security scan and security-scan agent prompts. */
export function reconContextBlock(recon: ReconResult): string {
  const excerpts = recon.fileExcerpts
    ? Object.entries(recon.fileExcerpts)
        .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
        .join("\n\n")
    : "(No file excerpts)";

  const extra: string[] = [];
  if (recon.dependencyAuditSnippet) {
    extra.push(
      `## Dependency audit (npm/pnpm)\n\`\`\`json\n${recon.dependencyAuditSnippet}\n\`\`\``,
    );
  }
  if (recon.secretPatternHints?.length) {
    extra.push(
      "## Secret-pattern heuristics in diff\n" +
        recon.secretPatternHints.map((h) => `- ${h}`).join("\n"),
    );
  }
  if (recon.optionalSarifSnippet) {
    extra.push(`## Semgrep SARIF excerpt\n\`\`\`\n${recon.optionalSarifSnippet}\n\`\`\``);
  }
  if (recon.dependencyGraph) {
    extra.push(
      "## Dependency graph (imports, env, sensitive APIs)\n```json\n" +
        JSON.stringify(recon.dependencyGraph, null, 2).slice(0, 32_000) +
        "\n```",
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

export function buildSecurityScanPrompt(
  recon: ReconResult,
  policies: PolicyRule[],
  extras?: { learnings?: string; knowledge?: string },
): string {
  const parts = [
    "## Custom policies",
    policiesBlockForScan(policies),
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
