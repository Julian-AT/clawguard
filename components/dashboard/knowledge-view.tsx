"use client";

import { Brain } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { KnowledgeCategory, KnowledgeEntry } from "@/lib/knowledge/types";
import { cn } from "@/lib/utils";

function categoryBadgeClass(category: KnowledgeCategory): string {
  switch (category) {
    case "pattern":
      return "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-400";
    case "anti-pattern":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400";
    case "adr":
      return "border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-400";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function TruncatedWithTooltip({ text, className }: { text: string; className?: string }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("block max-w-[min(40vw,20rem)] truncate", className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-md whitespace-pre-wrap">{text}</TooltipContent>
    </Tooltip>
  );
}

function StatCards({ entries }: { entries: KnowledgeEntry[] }) {
  const total = entries.length;
  const pattern = entries.filter((e) => e.category === "pattern").length;
  const anti = entries.filter((e) => e.category === "anti-pattern").length;
  const adr = entries.filter((e) => e.category === "adr").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total entries</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{total}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Pattern</CardDescription>
          <CardTitle className="text-3xl tabular-nums text-sky-600 dark:text-sky-400">
            {pattern}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Anti-pattern</CardDescription>
          <CardTitle className="text-3xl tabular-nums text-amber-600 dark:text-amber-400">
            {anti}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>ADR</CardDescription>
          <CardTitle className="text-3xl tabular-nums text-violet-600 dark:text-violet-400">
            {adr}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export function KnowledgeView({ entries }: { entries: KnowledgeEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="No org knowledge yet"
        description="Promote learnings from the learnings dashboard or use the API to append entries. Knowledge is injected into future scans."
      />
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-8">
        <StatCards entries={entries} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entries</CardTitle>
            <CardDescription>
              Org-wide patterns, anti-patterns, and architectural notes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Title</TableHead>
                    <TableHead className="w-[120px]">Category</TableHead>
                    <TableHead className="w-[140px]">Confidence</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[120px]">Sources</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[200px]">Summary</TableHead>
                    <TableHead className="w-[140px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="align-top font-medium">
                        <TruncatedWithTooltip text={e.title} />
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant="outline"
                          className={cn("capitalize", categoryBadgeClass(e.category))}
                        >
                          {e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <ConfidenceBar value={e.confidence} />
                      </TableCell>
                      <TableCell className="hidden align-top text-sm text-muted-foreground lg:table-cell">
                        {e.sourceRepos.length > 0 ? (
                          <TruncatedWithTooltip
                            text={e.sourceRepos.join(", ")}
                            className="text-sm"
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden align-top md:table-cell">
                        <TruncatedWithTooltip
                          text={e.body}
                          className="text-sm text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {formatDate(e.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
