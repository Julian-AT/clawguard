import { BookOpen, Brain, LineChart } from "lucide-react";
import Link from "next/link";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  demoRepoPrRows,
  demoRepoTrendChart,
} from "@/lib/demo-dashboard-data";
import { DEMO_OWNER, DEMO_REPO } from "@/lib/public-demo-dashboard";
import { cn } from "@/lib/utils";

const learningsHref = `/dashboard/${DEMO_OWNER}/learnings?repo=${encodeURIComponent(DEMO_REPO)}`;
const knowledgeHref = `/dashboard/${DEMO_OWNER}/knowledge`;
const trackingHref = `/dashboard/${DEMO_OWNER}/${DEMO_REPO}/tracking`;

export function DemoShowcaseHub() {
  const avgRepo =
    demoRepoPrRows.length > 0
      ? Math.round(demoRepoPrRows.reduce((s, r) => s + r.score, 0) / demoRepoPrRows.length)
      : 0;

  return (
    <div className="flex flex-col gap-12">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sample data
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Product showcase</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Organization overview and repository analytics for{" "}
          <span className="font-mono text-xs">
            {DEMO_OWNER}/{DEMO_REPO}
          </span>
          . Learnings, knowledge, and post-merge tracking live on their usual dashboard routes
          (linked below).
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

      <section className="space-y-6" aria-labelledby="more-heading">
        <div>
          <h2 id="more-heading" className="text-lg font-semibold tracking-tight">
            Also explore (sample data)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Same UI as production — open each area on its real route.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={learningsHref}>
              <BookOpen className="size-4" />
              Learnings
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={knowledgeHref}>
              <Brain className="size-4" />
              Knowledge
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={trackingHref}>
              <LineChart className="size-4" />
              Tracking
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-8" aria-labelledby="repo-heading">
        <div>
          <h2 id="repo-heading" className="text-lg font-semibold tracking-tight">
            Repository
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pull request audits and score trend for this repo.
          </p>
        </div>

        <div>
          <h3 className="font-mono text-2xl font-semibold tracking-tight">
            {DEMO_OWNER}/{DEMO_REPO}
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
                        href={`/report/${DEMO_OWNER}/${DEMO_REPO}/${r.pr}`}
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
    </div>
  );
}
