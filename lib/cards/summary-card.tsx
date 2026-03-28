/** @jsxImportSource chat */
import { Actions, Button, Card, CardText, Divider, Field, Fields, LinkButton, Table } from "chat";
import { countBySeverity } from "@/lib/analysis/scoring";
import type { AuditResult, Finding } from "@/lib/analysis/types";
import { SEVERITY_ORDER, severityEmoji } from "@/lib/constants";
import { getPublicBaseUrl } from "@/lib/env";

export { SEVERITY_ORDER, severityEmoji };

function reportUrl(owner: string, repo: string, number: number): string {
  const base = getPublicBaseUrl();
  return `${base}/report/${owner}/${repo}/${number}`;
}

export function buildSummaryCard(
  audit: AuditResult,
  pr: { owner: string; repo: string; number: number },
) {
  const counts = countBySeverity(audit.findings);

  const fixableCount = audit.findings.filter((f: Finding) =>
    ["CRITICAL", "HIGH"].includes(f.severity),
  ).length;

  const topFindings = audit.findings
    .filter((f: Finding) => ["CRITICAL", "HIGH", "MEDIUM"].includes(f.severity))
    .sort(
      (a: Finding, b: Finding) =>
        (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99),
    )
    .slice(0, 3);

  const summaryText =
    audit.summary?.trim() ||
    `${audit.findings.length} finding(s) — score ${audit.score}/100 (${audit.grade}).`;

  return (
    <Card title={`ClawGuard: ${audit.score}/100 (${audit.grade})`}>
      <CardText>{summaryText}</CardText>
      <Fields>
        <Field label="CRITICAL" value={String(counts.CRITICAL ?? 0)} />
        <Field label="HIGH" value={String(counts.HIGH ?? 0)} />
        <Field label="MEDIUM" value={String(counts.MEDIUM ?? 0)} />
        <Field label="LOW" value={String(counts.LOW ?? 0)} />
      </Fields>
      {topFindings.length > 0 ? (
        <Table
          headers={["Severity", "Finding", "Location"]}
          rows={topFindings.map((f) => [
            `${severityEmoji(f.severity)} ${f.severity}`,
            f.title ?? f.type,
            `${f.file}:${f.line}`,
          ])}
        />
      ) : (
        <CardText>No medium or higher severity findings.</CardText>
      )}
      <Divider />
      {fixableCount > 0 && (
        <CardText>
          {`Reply \`@clawguard fix all\` to auto-fix ${fixableCount} CRITICAL+HIGH finding(s), or \`@clawguard fix <type>\` for a specific issue.`}
        </CardText>
      )}
      <Actions>
        <Button id="fix-all" style="primary">
          Fix All ({fixableCount})
        </Button>
        <Button id="re-audit" style="default">
          Re-audit
        </Button>
        <LinkButton url={reportUrl(pr.owner, pr.repo, pr.number)}>View full report</LinkButton>
      </Actions>
    </Card>
  );
}

/** GitHub Issues/PR comment API only accepts markdown — use this for auto-trigger comments. */
export function buildSummaryMarkdown(
  audit: AuditResult,
  pr: { owner: string; repo: string; number: number },
): string {
  const counts = countBySeverity(audit.findings);
  const fixableCount = audit.findings.filter((f: Finding) =>
    ["CRITICAL", "HIGH"].includes(f.severity),
  ).length;
  const topFindings = audit.findings
    .filter((f: Finding) => ["CRITICAL", "HIGH", "MEDIUM"].includes(f.severity))
    .sort(
      (a: Finding, b: Finding) =>
        (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99),
    )
    .slice(0, 3);
  const summaryText =
    audit.summary?.trim() ||
    `${audit.findings.length} finding(s) — score ${audit.score}/100 (${audit.grade}).`;
  const lines: string[] = [
    `## ClawGuard: ${audit.score}/100 (${audit.grade})`,
    "",
    summaryText,
    "",
    `| CRITICAL | HIGH | MEDIUM | LOW | INFO |`,
    `|----------|------|--------|-----|------|`,
    `| ${counts.CRITICAL ?? 0} | ${counts.HIGH ?? 0} | ${counts.MEDIUM ?? 0} | ${counts.LOW ?? 0} | ${counts.INFO ?? 0} |`,
    "",
  ];
  if (topFindings.length > 0) {
    lines.push("| Severity | Finding | Location |", "|----------|---------|----------|");
    for (const f of topFindings) {
      lines.push(
        `| ${f.severity} | ${(f.title ?? f.type).replace(/\|/g, "\\|")} | \`${f.file}:${f.line}\` |`,
      );
    }
    lines.push("");
  }
  lines.push(`[View full report →](${reportUrl(pr.owner, pr.repo, pr.number)})`);
  if (fixableCount > 0) {
    lines.push(
      "",
      `Reply \`@clawguard fix all\` to auto-fix ${fixableCount} CRITICAL+HIGH finding(s), or \`@clawguard fix <type>\` for a specific issue.`,
    );
  }
  return lines.join("\n");
}
