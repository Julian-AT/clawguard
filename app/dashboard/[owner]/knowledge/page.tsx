import { KnowledgeView } from "@/components/dashboard/knowledge-view";
import { getSession } from "@/lib/auth";
import { demoKnowledgeEntries } from "@/lib/demo-dashboard-data";
import { listKnowledgeOrg } from "@/lib/knowledge";
import { isDemoDashboardOwner } from "@/lib/public-demo-dashboard";

interface PageProps {
  params: Promise<{ owner: string }>;
}

export default async function OrgKnowledgePage({ params }: PageProps) {
  const { owner } = await params;
  const session = await getSession();
  const entries =
    isDemoDashboardOwner(owner) && !session?.user
      ? demoKnowledgeEntries
      : await listKnowledgeOrg(owner);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Org-wide patterns, anti-patterns, and architectural notes injected into scans.
        </p>
      </div>

      <KnowledgeView entries={entries} />
    </div>
  );
}
