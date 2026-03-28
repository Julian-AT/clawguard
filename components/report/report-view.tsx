import type { AuditResult } from "@/lib/analysis/types";
import { countBySeverity } from "@/lib/analysis/scoring";
import { ReportHeader } from "@/components/report/report-header";
import { ScoreGauge } from "@/components/report/score-gauge";
import { SeverityBadges } from "@/components/report/severity-badges";
import { OwaspChart } from "@/components/report/owasp-chart";
import { FindingsList } from "@/components/report/findings-list";
import { ThreatModelTab } from "@/components/report/threat-model-tab";
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
            <p className="text-sm text-muted-foreground py-4">
              Compliance mapping table will be displayed here.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
