import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Team rules extracted from feedback and scans.
          {repo ? (
            <>
              {" "}
              Filtered to{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{repo}</code>.
            </>
          ) : (
            " Organization-wide entries — add ?repo=name for a repository filter."
          )}
        </p>
      </div>

      {orgLearnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Inherited by repos when enabled in config.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgLearnings.map((l) => (
              <div key={l.id} className="rounded-lg border border-border/80 bg-card/50 p-4 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{l.action}</Badge>
                  <span className="text-xs text-muted-foreground">confidence {l.confidence}</span>
                </div>
                <p className="font-medium">{l.pattern}</p>
                <p className="mt-1 text-muted-foreground">{l.context}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {repo && repoLearnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Repository <code className="font-mono text-base">{repo}</code>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {repoLearnings.map((l) => (
              <div key={l.id} className="rounded-lg border border-border/80 bg-card/50 p-4 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{l.action}</Badge>
                </div>
                <p className="font-medium">{l.pattern}</p>
                <p className="mt-1 text-muted-foreground">{l.context}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {orgLearnings.length === 0 && repoLearnings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No learnings stored yet. Reply to ClawGuard in a PR with feedback (e.g. false positive) to
          create one.
        </p>
      )}
    </div>
  );
}
