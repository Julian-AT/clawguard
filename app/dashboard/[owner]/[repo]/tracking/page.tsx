import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post-merge tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Correlation of labeled bugs with prior ClawGuard findings (GitHub issues webhook).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signals</CardTitle>
          <CardDescription>
            Updated when bug-labeled issues match predictions. Last update: {m.lastUpdated}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              True positives
            </p>
            <p className="text-2xl font-semibold tabular-nums">{m.truePositives}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              False positives
            </p>
            <p className="text-2xl font-semibold tabular-nums">{m.falsePositives}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Misses
            </p>
            <p className="text-2xl font-semibold tabular-nums">{m.misses}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precision (estimated)</CardTitle>
          <CardDescription>TP / (TP + FP) when both are non-zero.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">
            {precision != null ? `${(precision * 100).toFixed(1)}%` : "—"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Total correlated events recorded: {total}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
