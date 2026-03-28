import { LearningsView } from "@/components/dashboard/learnings-view";
import { listLearningsOrg, listLearningsRepo } from "@/lib/learnings";

interface PageProps {
  params: Promise<{ owner: string }>;
  searchParams: Promise<{ repo?: string }>;
}

export default async function OrgLearningsPage({ params, searchParams }: PageProps) {
  const { owner } = await params;
  const { repo } = await searchParams;
  const orgLearnings = await listLearningsOrg(owner);
  const repoLearnings = repo && repo.length > 0 ? await listLearningsRepo(owner, repo) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Team rules extracted from feedback and scans.
          {repo ? (
            <>
              {" "}
              Scoped to{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{repo}</code>{" "}
              (organization + repository tabs).
            </>
          ) : (
            " Organization-wide entries — open Tracking from a repo or add ?repo=name to compare repository learnings."
          )}
        </p>
      </div>

      <LearningsView
        owner={owner}
        repoFilter={repo && repo.length > 0 ? repo : null}
        orgLearnings={orgLearnings}
        repoLearnings={repoLearnings}
      />
    </div>
  );
}
