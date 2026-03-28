import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { readMetrics } from "@/lib/tracking/metrics";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function RepoTrackingPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  const { owner, repo } = await params;
  const m = await readMetrics(owner, repo);
  const total = m.truePositives + m.falsePositives + m.misses;
  const precision =
    m.truePositives + m.falsePositives > 0
      ? m.truePositives / (m.truePositives + m.falsePositives)
      : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link
          href={`/dashboard/${owner}/${repo}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {owner}/{repo}
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Post-merge tracking</h1>
        <p className="text-sm text-muted-foreground mt-1">
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
            <p className="text-muted-foreground text-xs uppercase">True positives</p>
            <p className="text-2xl font-semibold">{m.truePositives}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">False positives</p>
            <p className="text-2xl font-semibold">{m.falsePositives}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Misses</p>
            <p className="text-2xl font-semibold">{m.misses}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precision (estimated)</CardTitle>
          <CardDescription>TP / (TP + FP) when both are non-zero.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {precision != null ? `${(precision * 100).toFixed(1)}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Total correlated events recorded: {total}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
