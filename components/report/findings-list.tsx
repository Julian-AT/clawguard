"use client";

import { useMemo, useState } from "react";
import type { Finding, Severity } from "@/lib/analysis/types";
import { Accordion } from "@/components/ui/accordion";
import { FindingCard } from "@/components/report/finding-card";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_ORDER_LIST } from "@/lib/constants";

interface FindingsListProps {
  findings: Finding[];
}

function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER_LIST.indexOf(a.severity) -
      SEVERITY_ORDER_LIST.indexOf(b.severity)
  );
}

export function FindingsList({ findings }: FindingsListProps) {
  const sorted = sortBySeverity(findings);
  const [visible, setVisible] = useState<Set<Severity>>(
    () => new Set(SEVERITY_ORDER_LIST)
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((f) => {
      if (!visible.has(f.severity)) return false;
      if (!q) return true;
      return (
        f.file.toLowerCase().includes(q) ||
        f.cweId.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        f.owaspCategory.toLowerCase().includes(q) ||
        (f.title?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [sorted, visible, query]);

  const toggle = (s: Severity) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No findings detected -- the code looks clean.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_ORDER_LIST.map((s) => (
            <Badge
              key={s}
              variant={visible.has(s) ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => toggle(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search file, CWE, OWASP, title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No findings match the current filters.
        </p>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filtered.map((finding, idx) => (
            <FindingCard
              key={finding.id ?? `finding-${idx}`}
              finding={finding}
              value={finding.id ?? `finding-${idx}`}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}
