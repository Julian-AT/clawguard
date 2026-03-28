import { ComplianceTab } from "@/components/report/compliance-tab";
import { FindingsByCategory } from "@/components/report/findings-by-category";
import { FindingsList } from "@/components/report/findings-list";
import { OwaspChart } from "@/components/report/owasp-chart";
import { PrSummaryTab } from "@/components/report/pr-summary-tab";
import { ReportHeader } from "@/components/report/report-header";
import { ReportShell } from "@/components/report/report-shell";
import { ScoreGauge } from "@/components/report/score-gauge";
import { SeverityBadges } from "@/components/report/severity-badges";
import { TeamPatterns } from "@/components/report/team-patterns";
import { ThreatModelTab } from "@/components/report/threat-model-tab";
import { VerdictBanner } from "@/components/report/verdict-banner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countBySeverity } from "@/lib/analysis/scoring";
import type { AuditResult, FindingCategory } from "@/lib/analysis/types";
import { categoryLabel } from "@/lib/report/category-labels";

const FINDING_CATEGORY_TABS: FindingCategory[] = [
  "security",
  "quality",
  "architecture",
  "testing",
  "documentation",
  "performance",
];

interface ReportViewProps {
  result: AuditResult;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  timestamp: string;
  /** Shown when scan completed with degraded security stage */
  partialWarning?: string;
}

export function ReportView({
  result,
  owner,
  repo,
  prNumber,
  prTitle,
  timestamp,
  partialWarning,
}: ReportViewProps) {
  const counts = countBySeverity(result.findings);
  const countByCat = (cat: FindingCategory) =>
    result.findings.filter((f) => (f.category ?? "security") === cat).length;
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

        {partialWarning && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-foreground">
            <AlertTitle>Partial result</AlertTitle>
            <AlertDescription className="text-foreground/90">{partialWarning}</AlertDescription>
          </Alert>
        )}

        {result.verdict && <VerdictBanner verdict={result.verdict} />}

        <Card className="print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide">
              Executive summary
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-relaxed text-foreground/90">{executive}</p>
          </CardContent>
        </Card>

        <div className="flex items-start gap-8 flex-wrap">
          <ScoreGauge score={result.score} grade={result.grade} />
          <div className="flex flex-col gap-4 pt-2 min-w-[240px] flex-1">
            <SeverityBadges counts={counts} />
            <p className="text-xs text-muted-foreground">
              {result.findings.length} finding
              {result.findings.length !== 1 ? "s" : ""} across {result.phases?.length ?? 0} pipeline
              stage(s)
            </p>
            <OwaspChart findings={result.findings} />
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="findings">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="findings">All ({result.findings.length})</TabsTrigger>
            {FINDING_CATEGORY_TABS.map((cat) => (
              <TabsTrigger key={cat} value={`cat-${cat}`}>
                {categoryLabel(cat)} ({countByCat(cat)})
              </TabsTrigger>
            ))}
            <TabsTrigger value="pr-summary">PR Summary</TabsTrigger>
            <TabsTrigger value="threat-model">Threat Model</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="mt-4">
            <FindingsList findings={result.findings} />
          </TabsContent>

          {FINDING_CATEGORY_TABS.map((cat) => (
            <TabsContent key={cat} value={`cat-${cat}`} className="mt-4">
              <FindingsByCategory findings={result.findings} category={cat} />
            </TabsContent>
          ))}

          <TabsContent value="pr-summary" className="mt-4">
            <PrSummaryTab prSummary={result.prSummary} />
          </TabsContent>

          <TabsContent value="threat-model" className="mt-4">
            <ThreatModelTab threatModel={result.threatModel} />
          </TabsContent>

          <TabsContent value="compliance" className="mt-4">
            <ComplianceTab findings={result.findings} />
          </TabsContent>
        </Tabs>

        {result.teamPatterns && result.teamPatterns.length > 0 && (
          <TeamPatterns patterns={result.teamPatterns} />
        )}
      </div>
    </ReportShell>
  );
}
