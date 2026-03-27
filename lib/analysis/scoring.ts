import type { Finding } from "./types";

export const DEDUCTIONS = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
} as const satisfies Record<string, number>;

export const GRADE_THRESHOLDS = [
  [90, "A"],
  [80, "B"],
  [70, "C"],
  [60, "D"],
] as const;

export function calculateScore(findings: Finding[]): {
  score: number;
  grade: string;
} {
  const totalDeduction = findings.reduce(
    (sum, f) => sum + (DEDUCTIONS[f.severity as keyof typeof DEDUCTIONS] ?? 0),
    0
  );
  const score = Math.max(0, 100 - totalDeduction);
  const grade =
    GRADE_THRESHOLDS.find(([min]) => score >= min)?.[1] ?? "F";
  return { score, grade };
}

export function countBySeverity(
  findings: Finding[]
): Record<string, number> {
  const counts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}
