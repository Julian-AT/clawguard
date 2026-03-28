import type { Severity } from "@/lib/analysis/types";

/** Deduction per finding by severity (aligned with clawguard-plan scoring). */
export const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

/** Grade thresholds (min score inclusive). */
export const GRADE_THRESHOLDS: { min: number; grade: string }[] = [
  { min: 90, grade: "A" },
  { min: 80, grade: "B" },
  { min: 70, grade: "C" },
  { min: 60, grade: "D" },
  { min: 0, grade: "F" },
];

/** Outline `Badge` classes for letter grades (no primary/blue fill). */
export const GRADE_BADGE_CLASS: Record<string, string> = {
  A: "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
  B: "border-lime-500/50 text-lime-700 dark:text-lime-400",
  C: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  D: "border-orange-500/50 text-orange-700 dark:text-orange-400",
  F: "border-destructive/60 text-destructive",
};

/** Sort order: lower number = higher severity (for comparisons). */
export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

/** Iteration order for display (critical first). */
export const SEVERITY_ORDER_LIST: readonly Severity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
] as const;

/** Tailwind-oriented badge classes for severity (report UI). LOW uses slate, not primary blue. */
export const SEVERITY_BADGE_CLASS: Record<Severity, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-slate-500 text-white",
  INFO: "bg-zinc-500 text-white",
};

/** Chart / gauge colors (hex). Aligned with badge hues; LOW is slate not blue. */
export const SEVERITY_CHART_COLORS: Record<Severity, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#64748b",
  INFO: "#71717a",
};
