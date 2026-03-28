import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { KnowledgeView } from "@/components/dashboard/knowledge-view";
import { LearningsView } from "@/components/dashboard/learnings-view";
import { PrecisionStatCard } from "@/components/dashboard/precision-stat-card";
import { TrackingDistributionChart } from "@/components/dashboard/tracking-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GRADE_BADGE_CLASS } from "@/lib/constants";
import {
  demoAuditSeries,
  demoAuditTableRows,
  demoKnowledgeEntries,
  demoOrgLearnings,
  demoRepoLearnings,
  demoRepoPrRows,
  demoRepoTrendChart,
  demoTracking,
} from "@/lib/demo-dashboard-data";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

const OWNER = "demo";
const REPO = "demo";

export default function DemoDashboardPage() {
  const avgRepo =
    demoRepoPrRows.length > 0
      ? Math.round(demoRepoPrRows.reduce((s, r) => s + r.score, 0) / demoRepoPrRows.length)
      : 0;

  const trackingTotal =
    demoTracking.truePositives + demoTracking.falsePositives + demoTracking.misses;
  const precision =
    demoTracking.truePositives + demoTracking.falsePositives > 0
      ? demoTracking.truePositives / (demoTracking.truePositives + demoTracking.falsePositives)
      : null;

  const lastRelative = formatRelativeTime(demoTracking.lastUpdated);

  return (
    <div className="flex flex-col gap-12">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sample data
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Product showcase</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Overview, repository analytics, learnings, org knowledge, and post-merge tracking — the
          same surfaces your team sees after connecting ClawGuard. This page uses illustrative
          numbers only.
        </p>
      </div>

      <section className="space-y-6" aria-labelledby="overview-heading">
        <div>
          <h2 id="overview-heading" className="text-lg font-semibold tracking-tight">
            Overview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization-wide audit activity and recent pull requests across connected repositories.
          </p>
        </div>
        <SectionCards repoCount={5} totalAudits={47} avgScore={82} criticalFindings={3} />
        <ChartAreaInteractive auditSeries={demoAuditSeries} />
        <DataTable data={demoAuditTableRows} />
      </section>

      <Separator />

      <section className="space-y-8" aria-labelledby="repo-heading">
        <div>
          <h2 id="repo-heading" className="text-lg font-semibold tracking-tight">
            Repository
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-repo scores, trend, and links to interactive reports for{" "}
            <span className="font-mono text-xs">
              {OWNER}/{REPO}
            </span>
            .
          </p>
        </div>

        <div>
          <h3 className="font-mono text-2xl font-semibold tracking-tight">
            {OWNER}/{REPO}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Pull request audits and score trend</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Audits</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{demoRepoPrRows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average score</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{avgRepo}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latest</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {demoRepoPrRows[0]?.score ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score trend</CardTitle>
            <CardDescription>Completed audits over time</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={demoRepoTrendChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pull requests</CardTitle>
            <CardDescription>Open a row to view the full interactive report</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">PR</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                  <TableHead className="hidden md:table-cell">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoRepoPrRows.map((r) => (
                  <TableRow key={r.pr} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link
                        href={`/report/${OWNER}/${REPO}/${r.pr}`}
                        className="block text-primary underline-offset-4 hover:underline"
                      >
                        #{r.pr}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[min(40vw,24rem)] truncate text-muted-foreground">
                      {r.title}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.score}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          GRADE_BADGE_CLASS[r.grade] ?? "border-border text-muted-foreground",
                        )}
                      >
                        {r.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {new Date(r.timestamp).toLocaleString()} · {r.findings} findings
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-6" aria-labelledby="learnings-heading">
        <div>
          <h2 id="learnings-heading" className="text-lg font-semibold tracking-tight">
            Learnings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Team rules from feedback — organization and repository scopes.
          </p>
        </div>
        <LearningsView
          owner={OWNER}
          repoFilter={REPO}
          orgLearnings={demoOrgLearnings}
          repoLearnings={demoRepoLearnings}
        />
      </section>

      <Separator />

      <section className="space-y-6" aria-labelledby="knowledge-heading">
        <div>
          <h2 id="knowledge-heading" className="text-lg font-semibold tracking-tight">
            Knowledge
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Org-wide patterns and ADRs injected into future scans.
          </p>
        </div>
        <KnowledgeView entries={demoKnowledgeEntries} />
      </section>

      <Separator />

      <section className="mx-auto max-w-5xl space-y-8" aria-labelledby="tracking-heading">
        <div>
          <h2 id="tracking-heading" className="text-lg font-semibold tracking-tight">
            Post-merge tracking
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Correlation of labeled bugs with prior ClawGuard findings (GitHub issues webhook).{" "}
            <span className="font-mono text-xs text-muted-foreground/80">
              {OWNER}/{REPO}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Last updated {lastRelative}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="size-4 shrink-0" aria-hidden />
                <CardDescription>True positives</CardDescription>
              </div>
              <CardTitle className="text-3xl tabular-nums text-emerald-700 dark:text-emerald-300">
                {demoTracking.truePositives}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <XCircle className="size-4 shrink-0" aria-hidden />
                <CardDescription>False positives</CardDescription>
              </div>
              <CardTitle className="text-3xl tabular-nums text-amber-700 dark:text-amber-300">
                {demoTracking.falsePositives}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                <CardDescription>Misses</CardDescription>
              </div>
              <CardTitle className="text-3xl tabular-nums text-red-700 dark:text-red-300">
                {demoTracking.misses}
              </CardTitle>
            </CardHeader>
          </Card>
          <PrecisionStatCard precision={precision} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signal distribution</CardTitle>
            <CardDescription>
              Share of correlated outcomes · total events:{" "}
              <span className="font-mono font-medium text-foreground">{trackingTotal}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrackingDistributionChart
              truePositives={demoTracking.truePositives}
              falsePositives={demoTracking.falsePositives}
              misses={demoTracking.misses}
            />
          </CardContent>
        </Card>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="size-3.5 shrink-0" aria-hidden />
          Illustrative metrics for preview; production data comes from your issues webhook and
          labeled correlations.
        </p>
      </section>
    </div>
  );
}
