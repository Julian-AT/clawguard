import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listKnowledgeOrg } from "@/lib/knowledge";
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
}

export default async function OrgKnowledgePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  const { owner } = await params;
  const entries = await listKnowledgeOrg(owner);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Knowledge — {owner}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Org-wide patterns, anti-patterns, and architectural notes injected into scans.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No org knowledge yet. Promote learnings from the learnings dashboard or use the
          API to append entries.
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
                className="rounded-lg border border-border p-3 text-sm space-y-1"
              >
                <div className="flex flex-wrap gap-2 items-center">
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
