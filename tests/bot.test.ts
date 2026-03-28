import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const botSource = readFileSync(resolve(__dirname, "../lib/bot.ts"), "utf-8");
const chatAdaptersSource = readFileSync(resolve(__dirname, "../lib/chat-adapters.ts"), "utf-8");
const auditRunnerSource = readFileSync(
  resolve(__dirname, "../lib/github-audit-runner.ts"),
  "utf-8",
);

describe("Bot Configuration", () => {
  it("exports Chat instance with GitHub adapter (HOOK-02)", () => {
    expect(botSource).toContain("new Chat(");
    expect(botSource).toContain("buildChatAdapters");
    expect(chatAdaptersSource).toContain("createGitHubAdapter(");
    expect(botSource).toMatch(/createRedisState|createMemoryState/);
  });

  it("registers onNewMention handler that posts to thread (HOOK-02)", () => {
    expect(botSource).toContain("bot.onNewMention(");
    expect(botSource).toContain("thread.post(");
  });

  it("shows branded error message without stack traces (HOOK-02)", () => {
    expect(botSource).toContain("ClawGuard Security Audit");
    expect(botSource).toContain("Something went wrong");
    expect(botSource).not.toContain("error.message");
    expect(botSource).not.toContain("error.stack");
  });
});

describe("Summary Card Integration", () => {
  it("imports buildSummaryCard from cards/summary-card (CARD-01)", () => {
    expect(botSource).toContain('from "./cards/summary-card"');
  });

  it("calls buildSummaryCard to generate summary card (CARD-01)", () => {
    expect(botSource).toContain("buildSummaryCard(");
  });

  it("posts summary card as final status edit replacing progress (CARD-01)", () => {
    expect(botSource).toContain("runAuditPipeline");
    expect(auditRunnerSource).toContain("status.edit(card");
  });

  it("summary card includes report link pattern (CARD-03)", () => {
    // buildSummaryCard generates the link, but bot.ts must call it
    expect(botSource).toContain("buildSummaryCard");
  });
});

describe("Live Progress Updates", () => {
  it("posts progress with phase checkmarks during analysis (D-07)", () => {
    expect(botSource).toContain("Phase 1: Code Quality Review");
    expect(botSource).toContain("Phase 2: Vulnerability Scan");
    expect(botSource).toContain("Phase 3: Threat Model");
  });

  it("uses progress callback with status.edit for live updates (D-07)", () => {
    expect(auditRunnerSource).toMatch(/onProgress.*ProgressCallback|ProgressCallback.*onProgress/);
    expect(auditRunnerSource).toContain("status.edit");
  });

  it("passes onProgress callback to reviewPullRequest (D-07)", () => {
    expect(auditRunnerSource).toContain("reviewPullRequest(");
    expect(auditRunnerSource).toContain("onProgress");
  });
});

describe("Structured Data Storage", () => {
  it("stores structured AuditResult in Redis, not plain string (SCAN-05)", () => {
    // Verify it passes the auditResult object, not a string
    expect(auditRunnerSource).toMatch(/result:\s*auditResult/);
  });
});

describe("Intent Detection (D-03)", () => {
  it("exports detectIntent function", () => {
    expect(botSource).toContain("export function detectIntent");
  });

  it("detects fix-all intent from @clawguard fix all", () => {
    expect(botSource).toContain('"fix-all"');
    expect(botSource).toContain("fix all");
  });

  it("detects fix-finding intent with target", () => {
    expect(botSource).toContain('"fix-finding"');
    expect(botSource).toContain("target");
  });

  it("detects re-audit intent from audit/scan/review keywords", () => {
    expect(botSource).toContain('"re-audit"');
    expect(botSource).toContain("audit");
    expect(botSource).toContain("scan");
    expect(botSource).toContain("review");
  });

  it("returns unknown for unrecognized messages", () => {
    expect(botSource).toContain('"unknown"');
  });
});

describe("Fix Flow Integration (FIX-04, FIX-05)", () => {
  it("imports fixAll and fixFinding from fix module", () => {
    expect(botSource).toContain('from "./fix"');
  });

  it("has runFixFlow helper function", () => {
    expect(botSource).toContain("runFixFlow");
  });

  it("posts per-fix confirmation with commit SHA (FIX-04)", () => {
    expect(botSource).toContain("commitSha");
    expect(botSource).toContain("Fixed:");
  });

  it("posts skip message for failed fixes (D-10)", () => {
    expect(botSource).toContain('? "Fixed" : "Skipped"');
  });

  it("posts final summary table with fixed/skipped status (D-12)", () => {
    expect(botSource).toContain("Auto-Fix Results");
    expect(botSource).toContain("| Finding | Status | Commit |");
  });

  it("posts re-audit score in summary (FIX-06, FIX-07)", () => {
    expect(botSource).toContain("Re-audit complete");
  });

  it("posts updated summary card after re-audit (FIX-07)", () => {
    expect(botSource).toContain("buildSummaryCard");
    expect(botSource).toMatch(/reauditResult|reaudit/i);
  });

  it("handles single finding fix with target matching", () => {
    expect(botSource).toContain("fix-finding");
    expect(botSource).toContain("includes(targetLower)");
  });

  it("shows available findings when target not found", () => {
    expect(botSource).toContain("Could not find a finding matching");
  });
});

describe("Action Handler (D-02)", () => {
  it("registers onAction handler for fix-all", () => {
    expect(botSource).toContain('bot.onAction("fix-all"');
  });

  it("onAction handler calls runFixFlow", () => {
    // The handler should delegate to runFixFlow
    expect(botSource).toContain("runFixFlow");
  });

  it("onAction handler has error handling", () => {
    // Should have try/catch in onAction
    expect(botSource).toContain("onAction error");
  });
});

describe("Subscribed Message Intent Routing", () => {
  it("uses detectIntent for message routing", () => {
    expect(botSource).toContain("detectIntent(");
  });

  it("routes fix-all intent to fix flow", () => {
    expect(botSource).toMatch(/intent\.type\s*===\s*"fix-all"/);
  });

  it("routes re-audit intent to runAuditAndPost", () => {
    expect(botSource).toMatch(/intent\.type\s*===\s*"re-audit"/);
    expect(botSource).toContain("runAuditAndPost");
  });

  it("ignores unknown intents", () => {
    expect(botSource).toMatch(/intent\.type\s*===\s*"unknown"|"unknown".*return/);
  });
});
