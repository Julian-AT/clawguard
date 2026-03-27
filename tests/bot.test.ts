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

  it("handles errors with friendly message, no internals exposed (D-07)", () => {
    expect(botSource).toContain("catch");
    expect(botSource).toContain("Something went wrong");

    // Ensure error.message and error.stack are NOT passed to thread.post
    // Split source into lines and check that no thread.post call contains error internals
    const lines = botSource.split("\n");
    for (const line of lines) {
      if (line.includes("thread.post(")) {
        expect(line).not.toContain("error.message");
        expect(line).not.toContain("error.stack");
      }
    }
  });
});
