import { LearningsView } from "@/components/dashboard/learnings-view";
import { getSession } from "@/lib/auth";
import { demoOrgLearnings, demoRepoLearnings } from "@/lib/demo-dashboard-data";
import { listLearningsOrg, listLearningsRepo } from "@/lib/learnings";
import { DEMO_REPO, isDemoDashboardOwner } from "@/lib/public-demo-dashboard";

interface PageProps {
  params: Promise<{ owner: string }>;
  searchParams: Promise<{ repo?: string }>;
}

export default async function OrgLearningsPage({ params, searchParams }: PageProps) {
  const { owner } = await params;
  const { repo } = await searchParams;
  const session = await getSession();
  const demoData = isDemoDashboardOwner(owner) && !session?.user;

  const orgLearnings = demoData ? demoOrgLearnings : await listLearningsOrg(owner);

  const repoFilter = repo && repo.length > 0 ? repo : demoData ? DEMO_REPO : null;
  const repoLearnings =
    repoFilter && demoData
      ? demoRepoLearnings
      : repoFilter
        ? await listLearningsRepo(owner, repoFilter)
        : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Team rules extracted from feedback and scans.
          {repoFilter ? (
            <>
              {" "}
              Scoped to{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{repoFilter}</code>{" "}
              (organization + repository tabs).
            </>
          ) : (
            " Organization-wide entries — open Tracking from a repo or add ?repo=name to compare repository learnings."
          )}
        </p>
      </div>

      <LearningsView
        owner={owner}
        repoFilter={repoFilter}
        orgLearnings={orgLearnings}
        repoLearnings={repoLearnings}
      />
    </div>
  );
}
