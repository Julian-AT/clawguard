/** @jsxImportSource chat */
import { Actions, Button, Card, CardText, Divider, LinkButton, Table } from "chat";
import { countBySeverity } from "@/lib/analysis/scoring";
import type { AuditResult, Finding } from "@/lib/analysis/types";
import { SEVERITY_ORDER } from "@/lib/constants";
import { getPublicBaseUrl } from "@/lib/env";

export { SEVERITY_ORDER };

function reportUrl(owner: string, repo: string, number: number): string {
  const base = getPublicBaseUrl();
  return `${base}/report/${owner}/${repo}/${number}`;
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

/** Split audit summary into a short headline and optional overview body for the NOTE block. */
function splitNoteContent(audit: AuditResult): { headline: string; overview: string | null } {
  const raw = audit.summary?.trim() ?? "";
  if (!raw) {
    return {
      headline: `${audit.findings.length} finding(s) — score ${audit.score}/100 (${audit.grade}).`,
      overview: null,
    };
  }
  const parts = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { headline: parts[0], overview: null };
  }
  return { headline: parts[0], overview: parts.slice(1).join("\n\n") };
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

  const { headline, overview } = splitNoteContent(audit);

  const noteBody =
    overview != null
      ? `**Score: ${audit.score}/100 (${audit.grade})**\n\n${headline}\n\n**Overview**\n\n${overview}`
      : `**Score: ${audit.score}/100 (${audit.grade})**\n\n${headline}`;

  const countRows = [
    ["CRITICAL", String(counts.CRITICAL ?? 0)],
    ["HIGH", String(counts.HIGH ?? 0)],
    ["MEDIUM", String(counts.MEDIUM ?? 0)],
    ["LOW", String(counts.LOW ?? 0)],
    ["INFO", String(counts.INFO ?? 0)],
  ];

  return (
    <Card title="ClawGuard Security Audit">
      <CardText>{noteBody}</CardText>
      <Table headers={["Severity", "Count"]} rows={countRows} />
      {topFindings.length > 0 ? (
        <Table
          headers={["Severity", "Finding", "Location"]}
          rows={topFindings.map((f) => [
            f.severity,
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

  const { headline, overview } = splitNoteContent(audit);

  const noteLines: string[] = [
    "## ClawGuard Security Audit",
    "",
    "> [!NOTE]",
    `> **Score: ${audit.score}/100 (${audit.grade})**`,
  ];
  for (const line of headline.split("\n")) {
    noteLines.push(`> ${line}`);
  }
  if (overview != null) {
    noteLines.push(">", "> **Overview**");
    for (const line of overview.split("\n")) {
      noteLines.push(`> ${line}`);
    }
  }

  const lines: string[] = [...noteLines, "", "---", ""];

  lines.push("| Severity | Count |", "|----------|-------|");
  for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const) {
    lines.push(`| ${sev} | ${counts[sev] ?? 0} |`);
  }
  lines.push("");

  if (topFindings.length > 0) {
    lines.push("", "---", "");
    lines.push("| Severity | Finding | Location |", "|----------|---------|----------|");
    for (const f of topFindings) {
      lines.push(
        `| ${f.severity} | ${escapeTableCell(f.title ?? f.type)} | \`${escapeTableCell(`${f.file}:${f.line}`)}\` |`,
      );
    }
    lines.push("");
  }

  lines.push(`[View full report](${reportUrl(pr.owner, pr.repo, pr.number)})`);

  if (fixableCount > 0) {
    lines.push(
      "",
      `Reply \`@clawguard fix all\` to auto-fix ${fixableCount} CRITICAL+HIGH finding(s), or \`@clawguard fix <type>\` for a specific issue.`,
    );
  }

  return lines.join("\n");
}
