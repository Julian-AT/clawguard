"use client";

import { SearchX, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { FindingCard } from "@/components/report/finding-card";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Finding, Severity } from "@/lib/analysis/types";
import { SEVERITY_ORDER_LIST } from "@/lib/constants";

interface FindingsListProps {
  findings: Finding[];
}

function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER_LIST.indexOf(a.severity) - SEVERITY_ORDER_LIST.indexOf(b.severity),
  );
}

export function FindingsList({ findings }: FindingsListProps) {
  const sorted = sortBySeverity(findings);
  const [visible, setVisible] = useState<Set<Severity>>(() => new Set(SEVERITY_ORDER_LIST));
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((f) => {
      if (!visible.has(f.severity)) return false;
      if (!q) return true;
      return (
        f.file.toLowerCase().includes(q) ||
        (f.cweId?.toLowerCase().includes(q) ?? false) ||
        f.type.toLowerCase().includes(q) ||
        (f.owaspCategory?.toLowerCase().includes(q) ?? false) ||
        (f.title?.toLowerCase().includes(q) ?? false) ||
        (f.category?.toLowerCase().includes(q) ?? false)
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
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ShieldCheck className="size-10 text-muted-foreground/40" strokeWidth={1.25} aria-hidden />
        <h2 className="text-lg font-medium text-muted-foreground">Nothing here</h2>
        <p className="max-w-sm text-sm text-muted-foreground/70">
          No security findings were detected for this pull request.
        </p>
      </div>
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
        <Input
          type="search"
          placeholder="Search file, CWE, OWASP, title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:max-w-xs"
          aria-label="Filter findings"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground/35" strokeWidth={1.25} aria-hidden />
          <p className="text-sm text-muted-foreground">No findings match your filters.</p>
        </div>
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
