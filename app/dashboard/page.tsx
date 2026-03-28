import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import type { AuditTableRow } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { getSession } from "@/lib/auth";
import { Shield } from "lucide-react";
import { listPrAuditKeys, listReposWithAudits, loadAuditDataForKeys } from "@/lib/redis-queries";

function countCriticalFindings(result: { findings?: { severity: string }[] } | undefined): number {
  if (!result?.findings?.length) return 0;
  return result.findings.filter((f) => f.severity === "CRITICAL").length;
}

export default async function DashboardPage() {
  const session = await getSession();

  const repos = await listReposWithAudits();
  const rows: AuditTableRow[] = [];
  let totalCritical = 0;

  const repoSummaries = await Promise.all(
    repos.map(async (r) => {
      const keys = await listPrAuditKeys(r.owner, r.repo);
      const loaded = await loadAuditDataForKeys(keys);
      const complete = loaded.filter((x) => x.data.status === "complete" && x.data.result);

      for (const { key, data } of complete) {
        if (!data.result) continue;
        const criticalCount = countCriticalFindings(data.result);
        totalCritical += criticalCount;
        rows.push({
          id: key,
          owner: r.owner,
          repo: r.repo,
          prNumber: data.pr.number,
          title: data.pr.title,
          status: data.status,
          score: data.result.score,
          grade: data.result.grade,
          criticalCount,
          updatedAt: data.timestamp,
        });
      }

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

  rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const totalAudits = repoSummaries.reduce((s, r) => s + r.auditCount, 0);
  const scores = repoSummaries.map((r) => r.latestScore).filter((s): s is number => s != null);
  const avgLatest =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const day = new Date(row.updatedAt).toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { sum: 0, count: 0 };
    if (row.score != null) {
      cur.sum += row.score;
      cur.count += 1;
    }
    byDay.set(day, cur);
  }
  const auditSeries = [...byDay.entries()]
    .map(([date, { sum, count }]) => ({
      date,
      score: count > 0 ? Math.round(sum / count) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {session?.user?.name ?? session?.user?.email}
        </p>
      </div>

      {totalAudits === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <Shield className="size-10 text-muted-foreground/40" aria-hidden />
          <h2 className="text-lg font-medium text-muted-foreground">Nothing to show yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground/70">
            @mention ClawGuard on a pull request to run your first security audit.
          </p>
        </div>
      ) : (
        <>
          <SectionCards
            repoCount={repoSummaries.length}
            totalAudits={totalAudits}
            avgScore={avgLatest}
            criticalFindings={totalCritical}
          />

          <div className="px-4 lg:px-6">
            <ChartAreaInteractive auditSeries={auditSeries.length > 0 ? auditSeries : undefined} />
          </div>

          <DataTable data={rows} />
        </>
      )}
    </div>
  );
}
