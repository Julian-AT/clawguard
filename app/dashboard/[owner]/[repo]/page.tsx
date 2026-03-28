import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listPrAuditKeys,
  loadAuditDataForKeys,
} from "@/lib/redis-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendChart } from "@/components/dashboard/trend-chart";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function RepoDashboardPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  const { owner, repo } = await params;
  const keys = await listPrAuditKeys(owner, repo);
  if (keys.length === 0) {
    notFound();
  }

  const loaded = await loadAuditDataForKeys(keys);
  const rows = loaded
    .filter((x) => x.data.status === "complete" && x.data.result)
    .map((x) => {
      const prNum = Number(x.key.split("/pr/")[1]);
      return {
        pr: prNum,
        title: x.data.pr.title,
        score: x.data.result!.score,
        grade: x.data.result!.grade,
        timestamp: x.data.timestamp,
        findings: x.data.result!.findings.length,
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const chartData = [...rows]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((r) => ({
      label: `PR #${r.pr}`,
      score: r.score,
    }));

  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
        <h1 className="text-xl font-semibold mt-2 font-mono">
          {owner}/{repo}
        </h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Audits</CardDescription>
              <CardTitle className="text-3xl">{rows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average score</CardDescription>
              <CardTitle className="text-3xl">{avg}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latest</CardDescription>
              <CardTitle className="text-3xl">
                {rows[0]?.score ?? "—"}
              </CardTitle>
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
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((r) => (
              <Link
                key={r.pr}
                href={`/report/${owner}/${repo}/${r.pr}`}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <div className="font-medium">
                    PR #{r.pr}{" "}
                    <span className="text-muted-foreground font-normal text-sm">
                      {r.title}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.timestamp).toLocaleString()} · {r.findings}{" "}
                    findings
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold tabular-nums">
                    {r.score}
                  </span>
                  <Badge>{r.grade}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
