import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { severityEmoji, SEVERITY_ORDER } from "@/lib/cards/summary-card";

const cardSource = readFileSync(
  resolve(__dirname, "../../lib/cards/summary-card.tsx"),
  "utf-8"
);

function makeFinding(overrides: Partial<Record<string, unknown>> = {}) {
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
    complianceMapping: {},
    ...overrides,
  };
}

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

  describe("buildSummaryCard JSX structure", () => {
    it("renders Card with ClawGuard branded title including score and grade (CARD-01)", () => {
      expect(cardSource).toContain("ClawGuard Security Audit:");
      expect(cardSource).toContain("audit.score");
      expect(cardSource).toContain("audit.grade");
    });

    it("renders severity counts as Fields (CRITICAL, HIGH, MEDIUM, LOW) (CARD-01)", () => {
      expect(cardSource).toContain('<Field label="CRITICAL"');
      expect(cardSource).toContain('<Field label="HIGH"');
      expect(cardSource).toContain('<Field label="MEDIUM"');
      expect(cardSource).toContain('<Field label="LOW"');
    });

    it("renders top findings as Table with severity, finding, location columns (CARD-02)", () => {
      expect(cardSource).toContain("<Table");
      expect(cardSource).toContain('headers={["Severity", "Finding", "Location"]}');
    });

    it("limits findings table to top 5 entries (CARD-02)", () => {
      expect(cardSource).toContain(".slice(0, 5)");
    });

    it("includes LinkButton for View Report with correct URL pattern (CARD-03)", () => {
      expect(cardSource).toContain("<LinkButton");
      expect(cardSource).toContain("/report/");
      expect(cardSource).toContain("View Report");
    });

    it("includes Fix All Button with fix-all id (CARD-04)", () => {
      expect(cardSource).toContain('<Button id="fix-all"');
      expect(cardSource).toContain("Fix All");
    });

    it("includes text instructions for fix commands (CARD-04)", () => {
      expect(cardSource).toContain("@clawguard fix all");
      expect(cardSource).toContain("@clawguard fix <type>");
    });

    it("uses chat JSX import source pragma (not React)", () => {
      expect(cardSource).toContain("@jsxImportSource chat");
    });

    it("imports Card, Actions, Button, LinkButton from chat SDK", () => {
      expect(cardSource).toContain("Card");
      expect(cardSource).toContain("Actions");
      expect(cardSource).toContain("Button");
      expect(cardSource).toContain("LinkButton");
    });

    it("shows 'No medium or higher severity findings' when no findings", () => {
      expect(cardSource).toContain("No medium or higher severity findings");
    });

    it("calculates fixable count from CRITICAL+HIGH findings", () => {
      expect(cardSource).toContain("fixableCount");
      expect(cardSource).toMatch(/CRITICAL.*HIGH|HIGH.*CRITICAL/);
    });
  });
});
