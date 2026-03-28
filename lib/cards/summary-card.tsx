/** @jsxImportSource chat */
import {
  Card,
  CardText,
  Actions,
  Button,
  LinkButton,
  Fields,
  Field,
  Divider,
  Table,
} from "chat";
import type { AuditResult, Finding } from "@/lib/analysis/types";
import { countBySeverity } from "@/lib/analysis/scoring";
import { severityEmoji, SEVERITY_ORDER } from "@/lib/constants";
import { getPublicBaseUrl } from "@/lib/env";

export { severityEmoji, SEVERITY_ORDER };

function reportUrl(owner: string, repo: string, number: number): string {
  const base = getPublicBaseUrl();
  return `${base}/report/${owner}/${repo}/${number}`;
}

export function buildSummaryCard(
  audit: AuditResult,
  pr: { owner: string; repo: string; number: number }
) {
  const counts = countBySeverity(audit.findings);

  const fixableCount = audit.findings.filter((f: Finding) =>
    ["CRITICAL", "HIGH"].includes(f.severity)
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
        <LinkButton url={reportUrl(pr.owner, pr.repo, pr.number)}>
          View full report
        </LinkButton>
      </Actions>
    </Card>
  );
}
