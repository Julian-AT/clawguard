import type { AuditResult } from "@/lib/analysis/types";
import { countBySeverity } from "@/lib/analysis/scoring";
import { ReportHeader } from "@/components/report/report-header";
import { ReportShell } from "@/components/report/report-shell";
import { ScoreGauge } from "@/components/report/score-gauge";
import { SeverityBadges } from "@/components/report/severity-badges";
import { OwaspChart } from "@/components/report/owasp-chart";
import { FindingsList } from "@/components/report/findings-list";
import { ThreatModelTab } from "@/components/report/threat-model-tab";
import { ComplianceTab } from "@/components/report/compliance-tab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
  const executive =
    result.summary?.trim() ||
    `Security audit for PR #${prNumber}: ${result.findings.length} finding(s), score ${result.score}/100 (${result.grade}).`;

  return (
    <ReportShell owner={owner} repo={repo} prNumber={prNumber}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 text-foreground">
        <ReportHeader
          owner={owner}
          repo={repo}
          prNumber={prNumber}
          prTitle={prTitle}
          timestamp={timestamp}
        />

        <section className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Executive summary
          </h2>
          <p className="text-sm leading-relaxed text-foreground/90">{executive}</p>
        </section>

        {/* Score hero section */}
        <div className="flex items-start gap-8 flex-wrap">
          <ScoreGauge score={result.score} grade={result.grade} />
          <div className="flex flex-col gap-4 pt-2 min-w-[240px] flex-1">
            <SeverityBadges counts={counts} />
            <p className="text-xs text-muted-foreground">
              {result.findings.length} finding
              {result.findings.length !== 1 ? "s" : ""} across{" "}
              {result.phases?.length ?? 0} pipeline stage(s)
            </p>
            <OwaspChart findings={result.findings} />
          </div>
        </div>

        <Separator />

        {/* Tabbed content */}
        <Tabs defaultValue="findings">
          <TabsList>
            <TabsTrigger value="findings">
              Findings ({result.findings.length})
            </TabsTrigger>
            <TabsTrigger value="threat-model">Threat Model</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="mt-4">
            <FindingsList findings={result.findings} />
          </TabsContent>

          <TabsContent value="threat-model" className="mt-4">
            <ThreatModelTab threatModel={result.threatModel} />
          </TabsContent>

          <TabsContent value="compliance" className="mt-4">
            <ComplianceTab findings={result.findings} />
          </TabsContent>
        </Tabs>
      </div>
    </ReportShell>
  );
}
