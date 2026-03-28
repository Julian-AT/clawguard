"use client";

import type { Finding, FindingCategory } from "@/lib/analysis/types";
import { FindingsList } from "./findings-list";

interface FindingsByCategoryProps {
  findings: Finding[];
  category: FindingCategory;
}

export function FindingsByCategory({ findings, category }: FindingsByCategoryProps) {
  const subset = findings.filter((f) => (f.category ?? "security") === category);
  return <FindingsList findings={subset} />;
}
