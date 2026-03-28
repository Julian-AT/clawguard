import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SEVERITY_ORDER } from "@/lib/cards/summary-card";

const cardSource = readFileSync(resolve(__dirname, "../../lib/cards/summary-card.tsx"), "utf-8");

describe("Summary Card Builder", () => {
  describe("SEVERITY_ORDER", () => {
    it("orders CRITICAL first and INFO last", () => {
      expect(SEVERITY_ORDER.CRITICAL).toBeLessThan(SEVERITY_ORDER.HIGH);
      expect(SEVERITY_ORDER.HIGH).toBeLessThan(SEVERITY_ORDER.MEDIUM);
      expect(SEVERITY_ORDER.MEDIUM).toBeLessThan(SEVERITY_ORDER.LOW);
      expect(SEVERITY_ORDER.LOW).toBeLessThan(SEVERITY_ORDER.INFO);
    });
  });

  describe("buildSummaryCard JSX structure", () => {
    it("renders Card with ClawGuard Security Audit title and score in note body (CARD-01)", () => {
      expect(cardSource).toContain('title="ClawGuard Security Audit"');
      expect(cardSource).toContain("audit.score");
      expect(cardSource).toContain("audit.grade");
    });

    it("renders severity counts as Severity | Count table (CARD-01)", () => {
      expect(cardSource).toContain('<Table headers={["Severity", "Count"]}');
    });

    it("renders top findings as Table with severity, finding, location columns (CARD-02)", () => {
      expect(cardSource).toContain("<Table");
      expect(cardSource).toContain('headers={["Severity", "Finding", "Location"]}');
    });

    it("uses plain severity text in findings table rows (no emoji)", () => {
      expect(cardSource).toContain("f.severity");
      expect(cardSource).not.toMatch(/severityEmoji|\\uD83D/);
    });

    it("limits findings table to top 3 entries (CARD-02)", () => {
      expect(cardSource).toContain(".slice(0, 3)");
    });

    it("includes LinkButton for View Report with correct URL pattern (CARD-03)", () => {
      expect(cardSource).toContain("<LinkButton");
      expect(cardSource).toContain("/report/");
      expect(cardSource).toContain("View full report");
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

    it("buildSummaryMarkdown uses NOTE block and report link", () => {
      expect(cardSource).toContain("> [!NOTE]");
      expect(cardSource).toContain("buildSummaryMarkdown");
      expect(cardSource).toContain("[View full report]");
    });
  });
});
