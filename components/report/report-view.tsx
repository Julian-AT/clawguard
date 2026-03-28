import type { AuditResult } from "@/lib/analysis/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { countBySeverity } from "@/lib/analysis/scoring";

interface ReportViewProps {
  result: AuditResult;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  timestamp: string;
}

const severityColor: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-gray-500 text-white",
};

export function ReportView({ result, owner, repo, prNumber, prTitle, timestamp }: ReportViewProps) {
  const counts = countBySeverity(result.findings);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Security Report</h1>
          <p className="text-lg text-muted-foreground">
            {owner}/{repo} PR #{prNumber}: {prTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            Audited: {new Date(timestamp).toLocaleString()}
          </p>
        </div>

        {/* Score and severity overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Security Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {result.score}
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Badge variant="outline" className="mt-2 text-lg">
                Grade: {result.grade}
              </Badge>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Findings by Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map((sev) => (
                  <Badge
                    key={sev}
                    className={`${severityColor[sev]} text-sm px-3 py-1`}
                  >
                    {sev}: {counts[sev]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Findings list */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Findings ({result.findings.length})
          </h2>
          {result.findings.map((finding, idx) => (
            <Card key={finding.id ?? idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Badge className={severityColor[finding.severity]}>
                    {finding.severity}
                  </Badge>
                  <span className="font-semibold">
                    {finding.title ?? finding.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {finding.file}:{finding.line} | {finding.cweId} | {finding.owaspCategory}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{finding.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {result.summary && (
          <>
            <Separator />
            <div>
              <h2 className="text-xl font-semibold mb-2">Summary</h2>
              <p className="text-muted-foreground">{result.summary}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
