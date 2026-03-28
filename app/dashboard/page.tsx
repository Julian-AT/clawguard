import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { buttonVariants } from "@/lib/button-variants";
import { listPrAuditKeys, listReposWithAudits, loadAuditDataForKeys } from "@/lib/redis-queries";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">ClawGuard Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session.user?.name ?? session.user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/api/auth/signout?callbackUrl=/"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Sign out
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Repositories with stored PR audits (from Upstash).
          </p>
          <Link
            href={process.env.NEXT_PUBLIC_GITHUB_APP_URL ?? "https://github.com/apps"}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants())}
          >
            GitHub App settings
          </Link>
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
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base font-mono">
                      {r.owner}/{r.repo}
                    </CardTitle>
                    <CardDescription>
                      {r.auditCount} audit{r.auditCount === 1 ? "" : "s"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3">
                    {r.latestScore != null ? (
                      <>
                        <span className="text-2xl font-bold tabular-nums">{r.latestScore}</span>
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
      </main>
    </div>
  );
}
