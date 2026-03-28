import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listKnowledgeOrg } from "@/lib/knowledge";

interface PageProps {
  params: Promise<{ owner: string }>;
}

export default async function OrgKnowledgePage({ params }: PageProps) {
  const { owner } = await params;
  const entries = await listKnowledgeOrg(owner);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Org-wide patterns, anti-patterns, and architectural notes injected into scans.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No org knowledge yet. Promote learnings from the learnings dashboard or use the API to
          append entries.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
            <CardDescription>{entries.length} item(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entries.map((e) => (
              <div
                key={e.id}
                className="space-y-1 rounded-lg border border-border/80 bg-card/50 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{e.category}</Badge>
                  <span className="font-medium">{e.title}</span>
                </div>
                <p className="text-muted-foreground">{e.body}</p>
                {e.sourceRepos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sources: {e.sourceRepos.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
