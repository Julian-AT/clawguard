import type { AuditResult } from "@/lib/analysis/types";
import { countBySeverity } from "@/lib/analysis/scoring";
import { ReportHeader } from "@/components/report/report-header";
import { ScoreGauge } from "@/components/report/score-gauge";
import { SeverityBadges } from "@/components/report/severity-badges";

interface ReportViewProps {
  result: AuditResult;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  timestamp: string;
}

export function ReportView({
  result,
  owner,
  repo,
  prNumber,
  prTitle,
  timestamp,
}: ReportViewProps) {
  const counts = countBySeverity(result.findings);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <ReportHeader
          owner={owner}
          repo={repo}
          prNumber={prNumber}
          prTitle={prTitle}
          timestamp={timestamp}
        />

        {/* Score hero section */}
        <div className="flex items-start gap-8 flex-wrap">
          <ScoreGauge score={result.score} grade={result.grade} />
          <div className="flex flex-col gap-4 pt-2">
            <SeverityBadges counts={counts} />
            <p className="text-xs text-muted-foreground">
              {result.findings.length} finding{result.findings.length !== 1 ? "s" : ""} across{" "}
              {result.phases.length} analysis phases
            </p>
          </div>
        </div>

        {/* Findings placeholder -- wired in Task 03 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Findings ({result.findings.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Detailed findings view loading...
          </p>
        </div>
      </div>
    </div>
  );
}
