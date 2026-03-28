/** @jsxImportSource chat */
import {
  Card, CardText, Actions, Button, LinkButton,
  Fields, Field, Divider, Table,
} from "chat";
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
) {
  const counts = countBySeverity(audit.findings);

  const fixableCount = audit.findings.filter(
    (f: Finding) => ["CRITICAL", "HIGH"].includes(f.severity)
  ).length;

  const topFindings = audit.findings
    .filter((f: Finding) =>
      ["CRITICAL", "HIGH", "MEDIUM"].includes(f.severity)
    )
    .sort(
      (a: Finding, b: Finding) =>
        (SEVERITY_ORDER[a.severity] ?? 99) -
        (SEVERITY_ORDER[b.severity] ?? 99)
    )
    .slice(0, 5);

  return (
    <Card title={`ClawGuard Security Audit: ${audit.score}/100 (${audit.grade})`}>
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
            f.type,
            `${f.file}:${f.line}`,
          ])}
        />
      ) : (
        <CardText>No medium or higher severity findings.</CardText>
      )}
      <Divider />
      {fixableCount > 0 && (
        <CardText>
          {`Reply \`@clawguard fix all\` to auto-fix ${fixableCount} CRITICAL+HIGH findings, or \`@clawguard fix <type>\` for a specific finding.`}
        </CardText>
      )}
      <Actions>
        <Button id="fix-all" style="primary">Fix All ({fixableCount})</Button>
        <LinkButton url={`/report/${pr.owner}/${pr.repo}/${pr.number}`}>
          View Report
        </LinkButton>
      </Actions>
    </Card>
  );
}
