import { GRADE_THRESHOLDS, SEVERITY_DEDUCTIONS } from "@/lib/constants";
import type { Finding, Severity } from "./types";

export { GRADE_THRESHOLDS };

export function calculateScore(findings: Finding[]): number {
  const totalDeduction = findings.reduce(
    (sum, f) => sum + (SEVERITY_DEDUCTIONS[f.severity] || 0),
    0,
  );
  return Math.max(0, 100 - totalDeduction);
}

export function getGrade(score: number): string {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.min) return threshold.grade;
  }
  return "F";
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const f of findings) {
    counts[f.severity]++;
  }
  return counts;
}
