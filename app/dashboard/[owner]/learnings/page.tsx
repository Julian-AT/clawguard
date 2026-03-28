import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listLearningsOrg, listLearningsRepo } from "@/lib/learnings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ owner: string }>;
  searchParams: Promise<{ repo?: string }>;
}

export default async function OrgLearningsPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  const { owner } = await params;
  const { repo } = await searchParams;
  const orgLearnings = await listLearningsOrg(owner);
  const repoLearnings =
    repo && repo.length > 0
      ? await listLearningsRepo(owner, repo)
      : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Learnings — {owner}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Team rules extracted from feedback and scans.{" "}
          {repo ? (
            <>
              Filtered to <code className="text-xs">{repo}</code>.
            </>
          ) : (
            "Organization-wide entries only — add <code>?repo=name</code> for a repo."
          )}
        </p>
      </div>

      {orgLearnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>
              Inherited by repos when enabled in config.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orgLearnings.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap gap-2 items-center mb-1">
                  <Badge variant="outline">{l.action}</Badge>
                  <span className="text-xs text-muted-foreground">
                    confidence {l.confidence}
                  </span>
                </div>
                <p className="font-medium">{l.pattern}</p>
                <p className="text-muted-foreground mt-1">{l.context}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {repo && repoLearnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Repository <code>{repo}</code>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {repoLearnings.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap gap-2 items-center mb-1">
                  <Badge variant="outline">{l.action}</Badge>
                </div>
                <p className="font-medium">{l.pattern}</p>
                <p className="text-muted-foreground mt-1">{l.context}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {orgLearnings.length === 0 && repoLearnings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No learnings stored yet. Reply to ClawGuard in a PR with feedback (e.g. false
          positive) to create one.
        </p>
      )}
    </div>
  );
}
