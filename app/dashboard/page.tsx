import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { listPrAuditKeys, listReposWithAudits, loadAuditDataForKeys } from "@/lib/redis-queries";

export default async function DashboardPage() {
  const session = await getSession();

  const repos = await listReposWithAudits();
  const repoSummaries = await Promise.all(
    repos.map(async (r) => {
      const keys = await listPrAuditKeys(r.owner, r.repo);
      const loaded = await loadAuditDataForKeys(keys);
      const complete = loaded.filter((x) => x.data.status === "complete" && x.data.result);
      const sorted = [...complete].sort(
        (a, b) => new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime(),
      );
      const latest = sorted[0];
      return {
        ...r,
        auditCount: complete.length,
        latestScore: latest?.data.result?.score,
        latestGrade: latest?.data.result?.grade,
        latestAt: latest?.data.timestamp,
      };
    }),
  );

  const totalAudits = repoSummaries.reduce((s, r) => s + r.auditCount, 0);
  const scores = repoSummaries.map((r) => r.latestScore).filter((s): s is number => s != null);
  const avgLatest =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {session?.user?.name ?? session?.user?.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Repositories</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{repoSummaries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed audits</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{totalAudits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. latest score</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{avgLatest ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {repoSummaries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No audits yet</CardTitle>
            <CardDescription>
              @mention ClawGuard on a PR to generate your first report. Audits appear here
              automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repoSummaries.map((r) => (
            <Link key={`${r.owner}/${r.repo}`} href={`/dashboard/${r.owner}/${r.repo}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="font-mono text-base">
                    {r.owner}/{r.repo}
                  </CardTitle>
                  <CardDescription>
                    {r.auditCount} audit{r.auditCount === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  {r.latestScore != null ? (
                    <>
                      <span className="text-2xl font-semibold tabular-nums">{r.latestScore}</span>
                      <Badge variant="secondary">{r.latestGrade ?? "?"}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.latestAt ? new Date(r.latestAt).toLocaleDateString() : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">No completed audits</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
