import { Chat } from "chat";
import { createGitHubAdapter } from "@chat-adapter/github";
import type { GitHubRawMessage } from "@chat-adapter/github";
import { createRedisState } from "@chat-adapter/state-redis";
import { Octokit } from "@octokit/rest";
import { reviewPullRequest } from "./review";
import type { ProgressCallback } from "./review";
import { storeAuditResult } from "./redis";
import { buildSummaryCard } from "./cards/summary-card";
import type { AuditResult } from "./analysis/types";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const bot = new Chat({
  userName: process.env.GITHUB_BOT_USERNAME || "clawguard",
  adapters: {
    github: createGitHubAdapter( {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
    }),
  },
  state: createRedisState(),
});

/**
 * Shared audit logic for both onNewMention and onSubscribedMessage handlers.
 * Posts live progress with checkmarks during 3-phase analysis (D-07),
 * stores structured AuditResult in Redis, and replaces the progress
 * message with a branded summary card on completion.
 */
async function runAuditAndPost(
  thread: any,
  raw: GitHubRawMessage,
  status: any
): Promise<void> {
  const owner = raw.repository.owner.login;
  const repo = raw.repository.name;
  const prNumber = raw.prNumber;

  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const onProgress: ProgressCallback = async (phase, phaseStatus) => {
    const phases = {
      quality: { label: "Phase 1: Code Quality Review", done: false },
      vulnerability: { label: "Phase 2: Vulnerability Scan", done: false },
      threatModel: { label: "Phase 3: Threat Model", done: false },
    };

    // Mark completed phases
    if (phaseStatus === "complete") phases[phase].done = true;
    // Also mark all phases before current as complete
    const order = ["quality", "vulnerability", "threatModel"] as const;
    const currentIdx = order.indexOf(phase);
    for (let i = 0; i < currentIdx; i++) phases[order[i]].done = true;

    const lines = order.map((p) => {
      const icon = phases[p].done
        ? "\u2705"
        : p === phase && phaseStatus === "running"
          ? "\u23F3"
          : "\u2B1C";
      return `${icon} ${phases[p].label}`;
    });

    await status.edit(
      `## \uD83D\uDEE1\uFE0F ClawGuard Security Audit\n\n${lines.join("\n")}`
    );
  };

  const auditResult: AuditResult = await reviewPullRequest(
    { owner, repo, prBranch: pr.head.ref, baseBranch: pr.base.ref },
    onProgress
  );

  await storeAuditResult({
    key: `${owner}/${repo}/pr/${prNumber}`,
    data: {
      result: auditResult,
      timestamp: new Date().toISOString(),
      pr: { owner, repo, number: prNumber, title: pr.title },
      status: "complete",
    },
  });

  const card = buildSummaryCard(auditResult, {
    owner,
    repo,
    number: prNumber,
  });
  await status.edit(card);
}

bot.onNewMention(async (thread, message) => {
  const raw = message.raw as GitHubRawMessage;
  const prNumber = raw.prNumber;

  const status = await thread.post(
    `## \uD83D\uDEE1\uFE0F ClawGuard Security Audit\n\n\u2B1C Phase 1: Code Quality Review\n\u2B1C Phase 2: Vulnerability Scan\n\u2B1C Phase 3: Threat Model`
  );
  await thread.subscribe();

  try {
    await runAuditAndPost(thread, raw, status);
  } catch (error) {
    console.error("[bot] Review error:", error);
    await status.edit(
      `## \uD83D\uDEE1\uFE0F ClawGuard Security Audit\n\n\u274C Something went wrong during the security analysis. Please try again.`
    );
  }
});

bot.onSubscribedMessage(async (thread, message) => {
  const raw = message.raw as GitHubRawMessage;
  const body = (raw.comment?.body ?? "").toLowerCase();
  const botName = (
    process.env.GITHUB_BOT_USERNAME || "clawguard"
  ).toLowerCase();

  if (!body.includes(`@${botName}`)) return;

  const status = await thread.post(
    `## \uD83D\uDEE1\uFE0F ClawGuard Security Audit\n\n\u2B1C Phase 1: Code Quality Review\n\u2B1C Phase 2: Vulnerability Scan\n\u2B1C Phase 3: Threat Model`
  );

  try {
    await runAuditAndPost(thread, raw, status);
  } catch (error) {
    console.error("[bot] Review error:", error);
    await status.edit(
      `## \uD83D\uDEE1\uFE0F ClawGuard Security Audit\n\n\u274C Something went wrong during the security analysis. Please try again.`
    );
  }
});
