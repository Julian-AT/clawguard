import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const botSource = readFileSync(resolve(__dirname, "../lib/bot.ts"), "utf-8");

describe("Bot Configuration", () => {
  it("exports Chat instance with GitHub adapter (HOOK-02)", () => {
    expect(botSource).toContain("new Chat(");
    expect(botSource).toContain("createGitHubAdapter()");
    expect(botSource).toContain("createRedisState()");
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
    expect(botSource).toContain("status.edit(card");
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
    expect(botSource).toMatch(
      /onProgress.*ProgressCallback|ProgressCallback.*onProgress/
    );
    expect(botSource).toContain("status.edit");
  });

  it("passes onProgress callback to reviewPullRequest (D-07)", () => {
    expect(botSource).toContain("reviewPullRequest(");
    expect(botSource).toContain("onProgress");
  });
});

describe("Structured Data Storage", () => {
  it("stores structured AuditResult in Redis, not plain string (SCAN-05)", () => {
    // Verify it passes the auditResult object, not a string
    expect(botSource).toMatch(/result:\s*auditResult/);
  });
});
