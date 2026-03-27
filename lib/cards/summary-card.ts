import type { AuditResult, Finding } from "@/lib/analysis/types";
import { countBySeverity } from "@/lib/analysis/scoring";

export function severityEmoji(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: "\uD83D\uDD34",
    HIGH: "\uD83D\uDFE0",
    MEDIUM: "\uD83D\uDFE1",
    LOW: "\uD83D\uDD35",
    INFO: "\u26AA",
  };
  return map[severity] ?? "\u26AA";
}

export const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

export function buildSummaryCard(
  audit: AuditResult,
  pr: { owner: string; repo: string; number: number }
): string {
  const counts = countBySeverity(audit.allFindings);

  const topFindings = audit.allFindings
    .filter((f: Finding) =>
      ["CRITICAL", "HIGH", "MEDIUM"].includes(f.severity)
    )
    .sort(
      (a: Finding, b: Finding) =>
        (SEVERITY_ORDER[a.severity] ?? 99) -
        (SEVERITY_ORDER[b.severity] ?? 99)
    )
    .slice(0, 5);

  const lines: string[] = [
    `## \uD83D\uDEE1\uFE0F ClawGuard Security Audit: ${audit.score}/100 (${audit.grade})`,
    ``,
    `**\uD83D\uDD34 CRITICAL:** ${counts.CRITICAL} | **\uD83D\uDFE0 HIGH:** ${counts.HIGH} | **\uD83D\uDFE1 MEDIUM:** ${counts.MEDIUM} | **\uD83D\uDD35 LOW:** ${counts.LOW}`,
    ``,
  ];

  if (topFindings.length > 0) {
    lines.push(`| Severity | Finding | Location |`);
    lines.push(`|----------|---------|----------|`);
    for (const f of topFindings) {
      lines.push(
        `| ${severityEmoji(f.severity)} ${f.severity} | ${f.type} | \`${f.location.file}:${f.location.line}\` |`
      );
    }
  } else {
    lines.push(`*No medium or higher severity findings.*`);
  }

  lines.push(``);
  lines.push(
    `[View Full Report ->](/report/${pr.owner}/${pr.repo}/${pr.number})`
  );

  return lines.join("\n");
}
