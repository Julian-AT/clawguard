import { GRADE_THRESHOLDS, SEVERITY_DEDUCTIONS } from "@/lib/constants";
import type { Finding, FindingCategory, Severity } from "./types";

export { GRADE_THRESHOLDS };

/** Non-security findings affect score less so the grade stays security-focused */
const CATEGORY_SCORE_WEIGHT: Record<FindingCategory, number> = {
  security: 1,
  quality: 0.35,
  architecture: 0.35,
  testing: 0.35,
  documentation: 0.25,
  performance: 0.4,
};

export function calculateScore(findings: Finding[]): number {
  const totalDeduction = findings.reduce((sum, f) => {
    const base = SEVERITY_DEDUCTIONS[f.severity] || 0;
    const cat = f.category ?? "security";
    const w = CATEGORY_SCORE_WEIGHT[cat] ?? 0.35;
    return sum + base * w;
  }, 0);
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
