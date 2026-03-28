"use client";

import Link from "next/link";
import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

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

const columns: ColumnDef<AuditTableRow>[] = [
  {
    accessorKey: "repo",
    header: "Repository",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.owner}/{row.original.repo}
      </span>
    ),
  },
  {
    accessorKey: "prNumber",
    header: "PR",
    cell: ({ row }) => (
      <Link
        className="text-primary underline-offset-4 hover:underline"
        href={`/dashboard/${encodeURIComponent(row.original.owner)}/${encodeURIComponent(row.original.repo)}`}
      >
        #{row.original.prNumber}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="max-w-[min(24rem,40vw)] truncate" title={row.original.title}>
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.original.status.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.score ?? "—"}</span>
    ),
  },
  {
    accessorKey: "grade",
    header: "Grade",
    cell: ({ row }) => <Badge variant="secondary">{row.original.grade ?? "—"}</Badge>,
  },
  {
    accessorKey: "criticalCount",
    header: "Critical",
    cell: ({ row }) => (
      <span className="tabular-nums text-destructive">{row.original.criticalCount}</span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground text-xs">
        {new Date(row.original.updatedAt).toLocaleString()}
      </span>
    ),
  },
];

export function DataTable({ data }: { data: AuditTableRow[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
