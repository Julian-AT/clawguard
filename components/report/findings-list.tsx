"use client";

import type { Finding, Severity } from "@/lib/analysis/types";
import {
  Accordion,
} from "@/components/ui/accordion";
import { FindingCard } from "@/components/report/finding-card";

interface FindingsListProps {
  findings: Finding[];
}

const SEVERITY_ORDER: Severity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];

function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
}

export function FindingsList({ findings }: FindingsListProps) {
  const sorted = sortBySeverity(findings);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No findings detected -- the code looks clean.
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {sorted.map((finding, idx) => (
        <FindingCard
          key={finding.id ?? `finding-${idx}`}
          finding={finding}
          value={finding.id ?? `finding-${idx}`}
        />
      ))}
    </Accordion>
  );
}
