import { describe, it, expect } from "vitest";
import {
  calculateScore,
  countBySeverity,
  DEDUCTIONS,
  GRADE_THRESHOLDS,
} from "@/lib/analysis/scoring";
import type { Finding } from "@/lib/analysis/types";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    severity: "HIGH",
    type: "sql-injection",
    location: { file: "src/db/query.ts", line: 42 },
    cweId: "CWE-89",
    owaspCategory: "A03:2021-Injection",
    description: "User input concatenated directly into SQL query",
    attackScenario: "Attacker submits malicious SQL via input field",
    confidence: "high",
    dataFlow: {
      source: "req.body.username",
      transform: "string concatenation",
      sink: "db.query()",
    },
    fix: {
      before: 'db.query(`SELECT * FROM users WHERE name = \'${input}\'`)',
      after: "db.query('SELECT * FROM users WHERE name = $1', [input])",
    },
    complianceMapping: {},
    ...overrides,
  };
}

describe("Scoring Module (SCAN-06)", () => {
  describe("DEDUCTIONS constant", () => {
    it("has correct deduction values per D-10", () => {
      expect(DEDUCTIONS.CRITICAL).toBe(25);
      expect(DEDUCTIONS.HIGH).toBe(15);
      expect(DEDUCTIONS.MEDIUM).toBe(8);
      expect(DEDUCTIONS.LOW).toBe(3);
      expect(DEDUCTIONS.INFO).toBe(1);
    });
  });

  describe("GRADE_THRESHOLDS constant", () => {
    it("has correct grade thresholds", () => {
      expect(GRADE_THRESHOLDS).toEqual([
        [90, "A"],
        [80, "B"],
        [70, "C"],
        [60, "D"],
      ]);
    });
  });

  describe("calculateScore", () => {
    it("returns score 100 and grade A for zero findings", () => {
      const result = calculateScore([]);
      expect(result).toEqual({ score: 100, grade: "A" });
    });

    it("returns score 75 and grade C for one CRITICAL finding (100 - 25 = 75)", () => {
      const result = calculateScore([makeFinding({ severity: "CRITICAL" })]);
      expect(result).toEqual({ score: 75, grade: "C" });
    });

    it("returns score 60 and grade D for CRITICAL + HIGH (100 - 25 - 15 = 60)", () => {
      const result = calculateScore([
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "HIGH" }),
      ]);
      expect(result).toEqual({ score: 60, grade: "D" });
    });

    it("floors score at 0 when deductions exceed 100", () => {
      const findings = [
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
      ]; // 5 * 25 = 125 > 100
      const result = calculateScore(findings);
      expect(result).toEqual({ score: 0, grade: "F" });
    });

    it("returns grade A for score 90", () => {
      // 100 - 10 = 90 -> need 10 points deduction: LOW(3) + LOW(3) + INFO(1) + LOW(3) = 10
      const findings = [
        makeFinding({ severity: "LOW" }),
        makeFinding({ severity: "LOW" }),
        makeFinding({ severity: "INFO" }),
        makeFinding({ severity: "LOW" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(90);
      expect(result.grade).toBe("A");
    });

    it("returns grade B for score 89", () => {
      // 100 - 11 = 89 -> LOW(3) + MEDIUM(8) = 11
      const findings = [
        makeFinding({ severity: "LOW" }),
        makeFinding({ severity: "MEDIUM" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(89);
      expect(result.grade).toBe("B");
    });

    it("returns grade B for score 80", () => {
      // 100 - 20 = 80 -> HIGH(15) + LOW(3) + INFO(1) + INFO(1) = 20
      const findings = [
        makeFinding({ severity: "HIGH" }),
        makeFinding({ severity: "LOW" }),
        makeFinding({ severity: "INFO" }),
        makeFinding({ severity: "INFO" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(80);
      expect(result.grade).toBe("B");
    });

    it("returns grade C for score 79", () => {
      // 100 - 21 = 79 -> HIGH(15) + LOW(3) + LOW(3) = 21
      const findings = [
        makeFinding({ severity: "HIGH" }),
        makeFinding({ severity: "LOW" }),
        makeFinding({ severity: "LOW" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(79);
      expect(result.grade).toBe("C");
    });

    it("returns grade C for score 70", () => {
      // 100 - 30 = 70 -> HIGH(15) * 2 = 30
      const findings = [
        makeFinding({ severity: "HIGH" }),
        makeFinding({ severity: "HIGH" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(70);
      expect(result.grade).toBe("C");
    });

    it("returns grade D for score 69", () => {
      // 100 - 31 = 69 -> HIGH(15) + HIGH(15) + INFO(1) = 31
      const findings = [
        makeFinding({ severity: "HIGH" }),
        makeFinding({ severity: "HIGH" }),
        makeFinding({ severity: "INFO" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(69);
      expect(result.grade).toBe("D");
    });

    it("returns grade D for score 60", () => {
      // 100 - 40 = 60 -> CRITICAL(25) + HIGH(15) = 40
      const findings = [
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "HIGH" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(60);
      expect(result.grade).toBe("D");
    });

    it("returns grade F for score 59", () => {
      // 100 - 41 = 59 -> CRITICAL(25) + HIGH(15) + INFO(1) = 41
      const findings = [
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "HIGH" }),
        makeFinding({ severity: "INFO" }),
      ];
      const result = calculateScore(findings);
      expect(result.score).toBe(59);
      expect(result.grade).toBe("F");
    });
  });

  describe("countBySeverity", () => {
    it("returns correct counts for mixed findings", () => {
      const findings = [
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "HIGH" }),
        makeFinding({ severity: "HIGH" }),
      ];
      const result = countBySeverity(findings);
      expect(result).toEqual({
        CRITICAL: 1,
        HIGH: 2,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0,
      });
    });

    it("returns all zeros for empty findings", () => {
      const result = countBySeverity([]);
      expect(result).toEqual({
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0,
      });
    });
  });
});
