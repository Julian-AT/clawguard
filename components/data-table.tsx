"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GRADE_BADGE_CLASS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type AuditTableRow = {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  status: string;
  score: number | null;
  grade: string | null;
  criticalCount: number;
  updatedAt: string;
};

const PAGE_SIZE = 10;

function GradeCell({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn(GRADE_BADGE_CLASS[grade] ?? "border-border")}>
      {grade}
    </Badge>
  );
}

function renderCells(row: AuditTableRow) {
  return [
    <span key="repo" className="font-mono text-xs">
      {row.owner}/{row.repo}
    </span>,
    <Link
      key="pr"
      className="text-primary underline-offset-4 hover:underline"
      href={`/dashboard/${encodeURIComponent(row.owner)}/${encodeURIComponent(row.repo)}`}
    >
      #{row.prNumber}
    </Link>,
    <span key="title" className="max-w-[min(24rem,40vw)] truncate" title={row.title}>
      {row.title}
    </span>,
    <Badge key="status" variant="outline" className="capitalize">
      {row.status.replace(/_/g, " ")}
    </Badge>,
    <span key="score" className="tabular-nums">
      {row.score ?? "—"}
    </span>,
    <GradeCell key="grade" grade={row.grade} />,
    <span key="critical" className="tabular-nums text-destructive">
      {row.criticalCount}
    </span>,
    <span key="updated" className="whitespace-nowrap text-muted-foreground text-xs">
      {new Date(row.updatedAt).toLocaleString()}
    </span>,
  ];
}

const HEADERS = [
  "Repository",
  "PR",
  "Title",
  "Status",
  "Score",
  "Grade",
  "Critical",
  "Updated",
] as const;

export function DataTable({ data }: { data: AuditTableRow[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = data.slice(start, start + PAGE_SIZE);
  const canPrev = safePage > 0;
  const canNext = safePage < pageCount - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {HEADERS.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length > 0 ? (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  {renderCells(row).map((cell, i) => (
                    <TableCell key={`${row.id}-${HEADERS[i]}`}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={HEADERS.length} className="h-24 text-center">
                  No audits yet. @mention ClawGuard on a PR to populate this table.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data.length > 0 ? (
        <div className="flex items-center justify-end gap-2 px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!canPrev}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={!canNext}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
