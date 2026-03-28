"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { ConfidenceBar } from "@/components/dashboard/confidence-bar";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Learning, LearningAction } from "@/lib/learnings/types";
import { cn } from "@/lib/utils";

function actionBadgeClass(action: LearningAction): string {
  switch (action) {
    case "prefer":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400";
    case "suppress":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400";
    case "escalate":
      return "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-400";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function TruncatedCell({ text, className }: { text: string; className?: string }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("block max-w-[min(40vw,18rem)] truncate", className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-md whitespace-pre-wrap">{text}</TooltipContent>
    </Tooltip>
  );
}

function LearningsTable({
  rows,
  owner,
  repoForPrLink,
}: {
  rows: Learning[];
  owner: string;
  repoForPrLink: string | null;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No learnings in this scope yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[140px]">Pattern</TableHead>
          <TableHead className="w-[100px]">Action</TableHead>
          <TableHead className="w-[140px]">Confidence</TableHead>
          <TableHead className="w-[100px]">Source PR</TableHead>
          <TableHead className="hidden md:table-cell min-w-[160px]">Context</TableHead>
          <TableHead className="w-[140px]">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((l) => (
          <TableRow key={l.id}>
            <TableCell className="align-top font-medium">
              <TruncatedCell text={l.pattern} />
            </TableCell>
            <TableCell className="align-top">
              <Badge variant="outline" className={cn("capitalize", actionBadgeClass(l.action))}>
                {l.action}
              </Badge>
            </TableCell>
            <TableCell className="align-top">
              <ConfidenceBar value={l.confidence} />
            </TableCell>
            <TableCell className="align-top tabular-nums text-sm">
              {l.sourcePr != null ? (
                repoForPrLink ? (
                  <Link
                    href={`https://github.com/${owner}/${repoForPrLink}/pull/${l.sourcePr}`}
                    className="text-primary underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    #{l.sourcePr}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">#{l.sourcePr}</span>
                )
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="hidden align-top text-muted-foreground md:table-cell">
              <TruncatedCell text={l.context} className="text-sm" />
            </TableCell>
            <TableCell className="align-top text-muted-foreground text-xs">
              {formatDate(l.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatCards({ items }: { items: Learning[] }) {
  const total = items.length;
  const prefer = items.filter((l) => l.action === "prefer").length;
  const suppress = items.filter((l) => l.action === "suppress").length;
  const escalate = items.filter((l) => l.action === "escalate").length;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{total}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Prefer</CardDescription>
          <CardTitle className="text-3xl tabular-nums text-emerald-600 dark:text-emerald-400">
            {prefer}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Suppress / Escalate</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{suppress + escalate}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {suppress} suppress · {escalate} escalate
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}

export interface LearningsViewProps {
  owner: string;
  /** When set, show org + repo tabs and use repo for PR links in both tabs. */
  repoFilter: string | null;
  orgLearnings: Learning[];
  repoLearnings: Learning[];
}

export function LearningsView({
  owner,
  repoFilter,
  orgLearnings,
  repoLearnings,
}: LearningsViewProps) {
  const hasRepoContext = Boolean(repoFilter && repoFilter.length > 0);
  const emptyOverall = orgLearnings.length === 0 && (!hasRepoContext || repoLearnings.length === 0);

  if (emptyOverall) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No learnings yet"
        description="Reply to ClawGuard in a PR with feedback (for example a false positive) to create team rules that improve future scans."
      />
    );
  }

  const repoForLink = hasRepoContext ? repoFilter : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-8">
        {!hasRepoContext && (
          <>
            <StatCards items={orgLearnings} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organization</CardTitle>
                <CardDescription>Inherited by repos when enabled in config.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:px-6">
                <div className="overflow-x-auto">
                  <LearningsTable rows={orgLearnings} owner={owner} repoForPrLink={repoForLink} />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {hasRepoContext && (
          <Tabs defaultValue="org" className="space-y-6">
            <TabsList>
              <TabsTrigger value="org">Organization</TabsTrigger>
              <TabsTrigger value="repo">
                Repository
                <span className="ml-1 font-mono text-xs text-muted-foreground">{repoFilter}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="org" className="space-y-6">
              <StatCards items={orgLearnings} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Organization learnings</CardTitle>
                  <CardDescription>Inherited by repos when enabled in config.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:px-6">
                  <div className="overflow-x-auto">
                    <LearningsTable rows={orgLearnings} owner={owner} repoForPrLink={repoForLink} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="repo" className="space-y-6">
              <StatCards items={repoLearnings} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Repository learnings</CardTitle>
                  <CardDescription>Rules scoped to this repository.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:px-6">
                  <div className="overflow-x-auto">
                    <LearningsTable
                      rows={repoLearnings}
                      owner={owner}
                      repoForPrLink={repoForLink}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </TooltipProvider>
  );
}
