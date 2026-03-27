import { describe, it, expect } from "vitest";
import {
  buildSummaryCard,
  severityEmoji,
  SEVERITY_ORDER,
} from "@/lib/cards/summary-card";
import type { AuditResult, Finding } from "@/lib/analysis/types";

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

function makeAuditResult(overrides?: Partial<AuditResult>): AuditResult {
  const defaultFindings = [
    makeFinding({ severity: "CRITICAL", type: "hardcoded-secret", location: { file: "config/db.ts", line: 5 } }),
    makeFinding({ severity: "HIGH", type: "sql-injection", location: { file: "src/db/query.ts", line: 42 } }),
    makeFinding({ severity: "MEDIUM", type: "missing-csrf", location: { file: "src/api/handler.ts", line: 18 } }),
  ];

  return {
    phases: {
      quality: { summary: "Code quality review done", findings: [] },
      vulnerability: { summary: "Vuln scan done", findings: defaultFindings },
      threatModel: { summary: "Threat model done", findings: [] },
    },
    allFindings: defaultFindings,
    score: 52,
    grade: "F",
    severityCounts: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 0, INFO: 0 },
    ...overrides,
  };
}

const defaultPr = { owner: "test-owner", repo: "test-repo", number: 42 };

describe("Summary Card Builder", () => {
  describe("severityEmoji", () => {
    it("maps severity levels to correct emoji", () => {
      expect(severityEmoji("CRITICAL")).toBe("\uD83D\uDD34");
      expect(severityEmoji("HIGH")).toBe("\uD83D\uDFE0");
      expect(severityEmoji("MEDIUM")).toBe("\uD83D\uDFE1");
      expect(severityEmoji("LOW")).toBe("\uD83D\uDD35");
      expect(severityEmoji("INFO")).toBe("\u26AA");
    });

    it("returns default emoji for unknown severity", () => {
      expect(severityEmoji("UNKNOWN")).toBe("\u26AA");
    });
  });

  describe("SEVERITY_ORDER", () => {
    it("orders CRITICAL first and INFO last", () => {
      expect(SEVERITY_ORDER.CRITICAL).toBeLessThan(SEVERITY_ORDER.HIGH);
      expect(SEVERITY_ORDER.HIGH).toBeLessThan(SEVERITY_ORDER.MEDIUM);
      expect(SEVERITY_ORDER.MEDIUM).toBeLessThan(SEVERITY_ORDER.LOW);
      expect(SEVERITY_ORDER.LOW).toBeLessThan(SEVERITY_ORDER.INFO);
    });
  });

  describe("buildSummaryCard", () => {
    it("CARD-01: includes branded header with score and grade", () => {
      const audit = makeAuditResult();
      const card = buildSummaryCard(audit, defaultPr);
      expect(card).toContain("ClawGuard Security Audit:");
      expect(card).toContain(`${audit.score}/100`);
      expect(card).toContain(`(${audit.grade})`);
    });

    it("CARD-01: includes severity badge line", () => {
      const audit = makeAuditResult();
      const card = buildSummaryCard(audit, defaultPr);
      expect(card).toContain("CRITICAL:");
      expect(card).toContain("HIGH:");
      expect(card).toContain("MEDIUM:");
      expect(card).toContain("LOW:");
    });

    it("CARD-02: includes GFM findings table header", () => {
      const audit = makeAuditResult();
      const card = buildSummaryCard(audit, defaultPr);
      expect(card).toContain("| Severity | Finding | Location |");
    });

    it("CARD-02: does NOT include LOW or INFO severity in table (D-05)", () => {
      const findings = [
        makeFinding({ severity: "LOW", type: "info-disclosure" }),
        makeFinding({ severity: "INFO", type: "debug-logging" }),
        makeFinding({ severity: "MEDIUM", type: "missing-csrf" }),
      ];
      const audit = makeAuditResult({ allFindings: findings });
      const card = buildSummaryCard(audit, defaultPr);
      // Table should include MEDIUM row
      expect(card).toContain("missing-csrf");
      // Table should NOT include LOW or INFO rows
      const tableLines = card
        .split("\n")
        .filter((line) => line.startsWith("|") && !line.includes("Severity"));
      const hasLow = tableLines.some((line) => line.includes("LOW"));
      const hasInfo = tableLines.some((line) => line.includes("INFO"));
      expect(hasLow).toBe(false);
      expect(hasInfo).toBe(false);
    });

    it("CARD-02: limits table to top 5 findings (D-03)", () => {
      const findings = [
        makeFinding({ severity: "CRITICAL", type: "rce-1" }),
        makeFinding({ severity: "CRITICAL", type: "rce-2" }),
        makeFinding({ severity: "HIGH", type: "sqli-1" }),
        makeFinding({ severity: "HIGH", type: "sqli-2" }),
        makeFinding({ severity: "MEDIUM", type: "csrf-1" }),
        makeFinding({ severity: "MEDIUM", type: "csrf-2" }),
        makeFinding({ severity: "MEDIUM", type: "csrf-3" }),
      ];
      const audit = makeAuditResult({ allFindings: findings });
      const card = buildSummaryCard(audit, defaultPr);
      // Count data rows (exclude header and separator)
      const dataRows = card
        .split("\n")
        .filter(
          (line) =>
            line.startsWith("|") &&
            !line.includes("Severity") &&
            !line.startsWith("|---")
        );
      expect(dataRows.length).toBeLessThanOrEqual(5);
    });

    it("CARD-03: includes View Full Report link with correct URL", () => {
      const audit = makeAuditResult();
      const card = buildSummaryCard(audit, defaultPr);
      expect(card).toContain("View Full Report");
      expect(card).toContain("/report/test-owner/test-repo/42");
    });

    it("edge case: zero findings produces score 100/A with no table", () => {
      const audit = makeAuditResult({
        allFindings: [],
        score: 100,
        grade: "A",
        severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
      });
      const card = buildSummaryCard(audit, defaultPr);
      expect(card).toContain("100/100 (A)");
      expect(card).toContain("No medium or higher severity findings.");
      expect(card).not.toContain("| Severity | Finding | Location |");
    });

    it("sorts findings by severity (CRITICAL first)", () => {
      const findings = [
        makeFinding({ severity: "MEDIUM", type: "csrf" }),
        makeFinding({ severity: "CRITICAL", type: "rce" }),
        makeFinding({ severity: "HIGH", type: "sqli" }),
      ];
      const audit = makeAuditResult({ allFindings: findings });
      const card = buildSummaryCard(audit, defaultPr);
      const dataRows = card
        .split("\n")
        .filter(
          (line) =>
            line.startsWith("|") &&
            !line.includes("Severity") &&
            !line.startsWith("|---")
        );
      expect(dataRows[0]).toContain("CRITICAL");
      expect(dataRows[1]).toContain("HIGH");
      expect(dataRows[2]).toContain("MEDIUM");
    });
  });
});
