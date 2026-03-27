import { describe, it, expect } from "vitest";
import {
  FindingSchema,
  PhaseResultSchema,
  AuditResultSchema,
  SeveritySchema,
  ConfidenceSchema,
} from "@/lib/analysis/types";
import type { Finding } from "@/lib/analysis/types";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    severity: "HIGH",
    type: "sql-injection",
    location: { file: "src/db/query.ts", line: 42 },
    cweId: "CWE-89",
    owaspCategory: "A03:2021-Injection",
    description: "User input concatenated directly into SQL query without parameterization",
    attackScenario: "Attacker submits malicious SQL via username field to dump database",
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
    complianceMapping: {
      pciDss: "6.5.1",
      soc2: "CC6.1",
      hipaa: "164.312(a)(1)",
      nist: "SI-10",
      owaspAsvs: "5.3.4",
    },
    ...overrides,
  };
}

describe("Analysis Types - Zod Schemas", () => {
  describe("SeveritySchema", () => {
    it("accepts valid severity values", () => {
      expect(SeveritySchema.safeParse("CRITICAL").success).toBe(true);
      expect(SeveritySchema.safeParse("HIGH").success).toBe(true);
      expect(SeveritySchema.safeParse("MEDIUM").success).toBe(true);
      expect(SeveritySchema.safeParse("LOW").success).toBe(true);
      expect(SeveritySchema.safeParse("INFO").success).toBe(true);
    });

    it("rejects invalid severity", () => {
      expect(SeveritySchema.safeParse("UNKNOWN").success).toBe(false);
    });
  });

  describe("ConfidenceSchema", () => {
    it("accepts valid confidence values", () => {
      expect(ConfidenceSchema.safeParse("high").success).toBe(true);
      expect(ConfidenceSchema.safeParse("medium").success).toBe(true);
      expect(ConfidenceSchema.safeParse("low").success).toBe(true);
    });

    it("rejects invalid confidence", () => {
      expect(ConfidenceSchema.safeParse("very-high").success).toBe(false);
    });
  });

  describe("FindingSchema (SCAN-05)", () => {
    it("validates a complete finding with all SCAN-05 fields", () => {
      const finding = makeFinding();
      const result = FindingSchema.safeParse(finding);
      expect(result.success).toBe(true);
    });

    it("rejects empty object (missing required fields)", () => {
      const result = FindingSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts finding where complianceMapping fields are all omitted (optional)", () => {
      const finding = makeFinding({ complianceMapping: {} });
      const result = FindingSchema.safeParse(finding);
      expect(result.success).toBe(true);
    });

    it("includes confidence field (D-08)", () => {
      const finding = makeFinding({ confidence: "medium" });
      const result = FindingSchema.safeParse(finding);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confidence).toBe("medium");
      }
    });

    it("includes dataFlow with source, transform, sink", () => {
      const finding = makeFinding();
      const result = FindingSchema.safeParse(finding);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dataFlow.source).toBe("req.body.username");
        expect(result.data.dataFlow.transform).toBe("string concatenation");
        expect(result.data.dataFlow.sink).toBe("db.query()");
      }
    });

    it("includes fix with before and after", () => {
      const finding = makeFinding();
      const result = FindingSchema.safeParse(finding);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fix.before).toBeTruthy();
        expect(result.data.fix.after).toBeTruthy();
      }
    });
  });

  describe("PhaseResultSchema", () => {
    it("validates a phase result with summary and findings", () => {
      const result = PhaseResultSchema.safeParse({
        summary: "Code quality review complete. Found 1 issue.",
        findings: [makeFinding()],
      });
      expect(result.success).toBe(true);
    });

    it("validates a phase result with empty findings", () => {
      const result = PhaseResultSchema.safeParse({
        summary: "No issues found.",
        findings: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("AuditResultSchema", () => {
    it("validates a complete audit result", () => {
      const auditResult = {
        phases: {
          quality: { summary: "Quality review done", findings: [] },
          vulnerability: { summary: "Vuln scan done", findings: [makeFinding()] },
          threatModel: { summary: "Threat model done", findings: [] },
        },
        allFindings: [makeFinding()],
        score: 85,
        grade: "B",
        severityCounts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0, INFO: 0 },
      };
      const result = AuditResultSchema.safeParse(auditResult);
      expect(result.success).toBe(true);
    });
  });
});
