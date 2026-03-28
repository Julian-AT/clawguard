import type { Finding, Severity } from "./types";

export const DEDUCTIONS: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

export const GRADE_THRESHOLDS: { min: number; grade: string }[] = [
  { min: 90, grade: "A" },
  { min: 80, grade: "B" },
  { min: 70, grade: "C" },
  { min: 60, grade: "D" },
  { min: 0, grade: "F" },
];

export function calculateScore(findings: Finding[]): number {
  const totalDeduction = findings.reduce(
    (sum, f) => sum + (DEDUCTIONS[f.severity] || 0),
    0
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
