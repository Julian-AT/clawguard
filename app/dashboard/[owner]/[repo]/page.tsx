import Link from "next/link";
import { Shield } from "lucide-react";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GRADE_BADGE_CLASS } from "@/lib/constants";
import { listPrAuditKeys, loadAuditDataForKeys } from "@/lib/redis-queries";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function RepoDashboardPage({ params }: PageProps) {
  const { owner, repo } = await params;
  const keys = await listPrAuditKeys(owner, repo);
  if (keys.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {owner}/{repo}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Pull request audits and score trend</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <Shield className="size-10 text-muted-foreground/40" aria-hidden />
          <h2 className="text-lg font-medium text-muted-foreground">Nothing here yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground/70">
            @mention ClawGuard on a pull request to run your first security audit.
          </p>
        </div>
      </div>
    );
  }

  const loaded = await loadAuditDataForKeys(keys);
  const rows = loaded
    .filter((x) => x.data.status === "complete" && x.data.result)
    .map((x) => {
      const prNum = Number(x.key.split("/pr/")[1]);
      const result = x.data.result;
      return {
        pr: prNum,
        title: x.data.pr.title,
        score: result?.score ?? 0,
        grade: result?.grade ?? "?",
        timestamp: x.data.timestamp,
        findings: result?.findings?.length ?? 0,
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const chartData = [...rows]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((r) => ({
      label: `PR #${r.pr}`,
      score: r.score,
    }));

  const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          {owner}/{repo}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Pull request audits and score trend</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Audits</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average score</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{avg}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{rows[0]?.score ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score trend</CardTitle>
            <CardDescription>Completed audits over time</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={chartData} />
          </CardContent>
        </Card>
      )}

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
              {rows.map((r) => (
                <TableRow key={r.pr} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link
                      href={`/report/${owner}/${repo}/${r.pr}`}
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
    </div>
  );
}
