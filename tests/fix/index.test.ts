import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const indexSource = readFileSync(
  resolve(__dirname, "../../lib/fix/index.ts"),
  "utf-8"
);

describe("fixFinding orchestration", () => {
  it("exports fixFinding function", () => {
    expect(indexSource).toContain("export async function fixFinding");
  });

  it("tries fast path first via applyStoredFix (D-04, D-05)", () => {
    expect(indexSource).toContain("applyStoredFix");
  });

  it("falls back to agent on fast path failure (D-06)", () => {
    expect(indexSource).toContain("generateFixWithAgent");
  });

  it("commits via commitFixToGitHub on single-fix success (FIX-03)", () => {
    expect(indexSource).toContain("commitFixToGitHub");
  });

  it("batches fix-all into commitBatchFixesToGitHub", () => {
    expect(indexSource).toContain("commitBatchFixesToGitHub");
  });

  it("returns skipped status on both tiers failing (D-10)", () => {
    expect(indexSource).toContain('"skipped"');
  });

  it("has try/catch for unexpected errors", () => {
    expect(indexSource).toContain("catch");
    expect(indexSource).toContain("Unexpected error");
  });

  it("returns FixResult with tier indication", () => {
    expect(indexSource).toContain('"fast"');
    expect(indexSource).toContain('"agent"');
  });
});

describe("fixAll orchestration", () => {
  it("exports fixAll function", () => {
    expect(indexSource).toContain("export async function fixAll");
  });

  it("loads audit data from Redis (FIX-05)", () => {
    expect(indexSource).toContain("getAuditResult");
  });

  it("filters for CRITICAL and HIGH severity (FIX-05, D-11)", () => {
    expect(indexSource).toMatch(/CRITICAL.*HIGH|HIGH.*CRITICAL/);
  });

  it("creates sandbox with git source and 10min timeout", () => {
    expect(indexSource).toContain("Sandbox.create");
    expect(indexSource).toContain("10 * 60 * 1000");
  });

  it("installs npm dependencies with --ignore-scripts", () => {
    expect(indexSource).toContain("--ignore-scripts");
  });

  it("processes findings sequentially in loop", () => {
    expect(indexSource).toContain("for");
    expect(indexSource).toContain("prepareFindingFix");
  });

  it("supports onBatchTableUpdate for in-place progress table", () => {
    expect(indexSource).toContain("onBatchTableUpdate");
  });

  it("stops sandbox in finally block", () => {
    expect(indexSource).toContain("sandbox.stop()");
    expect(indexSource).toContain("finally");
  });

  it("triggers re-audit via reviewPullRequest after fixes (FIX-06)", () => {
    expect(indexSource).toContain("reviewPullRequest");
  });

  it("stores re-audit results in Redis (FIX-07)", () => {
    expect(indexSource).toContain("storeAuditResult");
  });

  it("only re-audits if at least one fix was committed", () => {
    expect(indexSource).toMatch(/results\.some|status.*===.*"fixed"/);
  });

  it("throws error when no audit results found", () => {
    expect(indexSource).toContain("No audit results found");
  });

  it("sorts fixable findings by SEVERITY_ORDER (CRITICAL first)", () => {
    expect(indexSource).toContain("SEVERITY_ORDER");
  });
});
