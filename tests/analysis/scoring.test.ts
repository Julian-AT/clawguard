import { describe, it, expect } from "vitest";
import {
  calculateScore,
  getGrade,
  countBySeverity,
  GRADE_THRESHOLDS,
} from "@/lib/analysis/scoring";
import { SEVERITY_DEDUCTIONS } from "@/lib/constants";
import type { Finding } from "@/lib/analysis/types";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    severity: "HIGH",
    type: "sql-injection",
    file: "src/db/query.ts",
    line: 42,
    cweId: "CWE-89",
    owaspCategory: "A03:2021-Injection",
    description: "User input concatenated directly into SQL query",
    attackScenario: "Attacker submits malicious SQL via input field",
    confidence: "HIGH",
    dataFlow: {
      nodes: [
        { label: "req.body.username", type: "source" },
        { label: "string concatenation", type: "transform" },
        { label: "db.query()", type: "sink" },
      ],
    },
    fix: {
      before: 'db.query(`SELECT * FROM users WHERE name = \'${input}\'`)',
      after: "db.query('SELECT * FROM users WHERE name = $1', [input])",
    },
    ...overrides,
  };
}

describe("Scoring Module (SCAN-06)", () => {
  describe("SEVERITY_DEDUCTIONS", () => {
    it("has correct deduction values", () => {
      expect(SEVERITY_DEDUCTIONS.CRITICAL).toBe(25);
      expect(SEVERITY_DEDUCTIONS.HIGH).toBe(15);
      expect(SEVERITY_DEDUCTIONS.MEDIUM).toBe(8);
      expect(SEVERITY_DEDUCTIONS.LOW).toBe(3);
      expect(SEVERITY_DEDUCTIONS.INFO).toBe(1);
    });
  });

  describe("GRADE_THRESHOLDS constant", () => {
    it("has correct grade thresholds", () => {
      expect(GRADE_THRESHOLDS).toEqual([
        { min: 90, grade: "A" },
        { min: 80, grade: "B" },
        { min: 70, grade: "C" },
        { min: 60, grade: "D" },
        { min: 0, grade: "F" },
      ]);
    });
  });

  describe("calculateScore", () => {
    it("returns score 100 for zero findings", () => {
      const score = calculateScore([]);
      expect(score).toBe(100);
    });

    it("returns score 75 for one CRITICAL finding (100 - 25 = 75)", () => {
      const score = calculateScore([makeFinding({ severity: "CRITICAL" })]);
      expect(score).toBe(75);
    });

    it("returns score 60 for CRITICAL + HIGH (100 - 25 - 15 = 60)", () => {
      const score = calculateScore([
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "HIGH" }),
      ]);
      expect(score).toBe(60);
    });

    it("floors score at 0 when deductions exceed 100", () => {
      const findings = [
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
        makeFinding({ severity: "CRITICAL" }),
      ]; // 5 * 25 = 125 > 100
      const score = calculateScore(findings);
      expect(score).toBe(0);
    });
  });

  describe("getGrade", () => {
    it("returns grade A for score >= 90", () => {
      expect(getGrade(100)).toBe("A");
      expect(getGrade(90)).toBe("A");
    });

    it("returns grade B for score 80-89", () => {
      expect(getGrade(89)).toBe("B");
      expect(getGrade(80)).toBe("B");
    });

    it("returns grade C for score 70-79", () => {
      expect(getGrade(79)).toBe("C");
      expect(getGrade(70)).toBe("C");
    });

    it("returns grade D for score 60-69", () => {
      expect(getGrade(69)).toBe("D");
      expect(getGrade(60)).toBe("D");
    });

    it("returns grade F for score < 60", () => {
      expect(getGrade(59)).toBe("F");
      expect(getGrade(0)).toBe("F");
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
