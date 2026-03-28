import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PrecisionStatCard } from "@/components/dashboard/precision-stat-card";
import { TrackingDistributionChart } from "@/components/dashboard/tracking-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { readMetrics } from "@/lib/tracking/metrics";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function RepoTrackingPage({ params }: PageProps) {
  const { owner, repo } = await params;
  const m = await readMetrics(owner, repo);
  const total = m.truePositives + m.falsePositives + m.misses;
  const precision =
    m.truePositives + m.falsePositives > 0
      ? m.truePositives / (m.truePositives + m.falsePositives)
      : null;

  const lastRelative = formatRelativeTime(m.lastUpdated);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post-merge tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Correlation of labeled bugs with prior ClawGuard findings (GitHub issues webhook).{" "}
          <span className="font-mono text-xs text-muted-foreground/80">
            {owner}/{repo}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Last updated {lastRelative}</p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={Activity}
          title="No tracking data yet"
          description="When bug-labeled issues correlate with prior findings, counts appear here. Ensure the issues webhook is configured for this repository."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="size-4 shrink-0" aria-hidden />
                  <CardDescription>True positives</CardDescription>
                </div>
                <CardTitle className="text-3xl tabular-nums text-emerald-700 dark:text-emerald-300">
                  {m.truePositives}
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
                  {m.falsePositives}
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
                  {m.misses}
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
                <span className="font-mono font-medium text-foreground">{total}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrackingDistributionChart
                truePositives={m.truePositives}
                falsePositives={m.falsePositives}
                misses={m.misses}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
