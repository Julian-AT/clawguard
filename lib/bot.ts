import { Chat } from "chat";
import { createGitHubAdapter } from "@chat-adapter/github";
import type { GitHubRawMessage } from "@chat-adapter/github";
import { createRedisState } from "@chat-adapter/state-redis";
import { Octokit } from "@octokit/rest";
import { reviewPullRequest } from "./review";
import type { ProgressCallback } from "./review";
import { storeAuditResult, getAuditResult } from "./redis";
import { buildSummaryCard } from "./cards/summary-card";
import type { AuditResult } from "./analysis/types";
import { fixAll, fixFinding } from "./fix";
import type { FixResult, FixContext } from "./fix/types";
import { severityEmoji } from "./cards/summary-card";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const bot = new Chat({
  userName: process.env.GITHUB_BOT_USERNAME || "clawguard",
  adapters: {
    github: createGitHubAdapter({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
    }),
  },
  state: createRedisState(),
});

// ---------------------------------------------------------------------------
// Intent detection (D-03)
// ---------------------------------------------------------------------------

export type Intent =
  | { type: "fix-all" }
  | { type: "fix-finding"; target: string }
  | { type: "re-audit" }
  | { type: "unknown" };

export function detectIntent(body: string, botName: string): Intent {
  const lower = body.toLowerCase();
  const mention = `@${botName.toLowerCase()}`;

  if (!lower.includes(mention)) return { type: "unknown" };

  const afterMention = lower.split(mention).pop()?.trim() ?? "";

  if (afterMention.startsWith("fix all")) {
    return { type: "fix-all" };
  }

  const fixMatch = afterMention.match(/^fix\s+(.+)/);
  if (fixMatch) {
    return { type: "fix-finding", target: fixMatch[1].trim() };
  }

  if (
    afterMention.startsWith("audit") ||
    afterMention.startsWith("scan") ||
    afterMention.startsWith("review")
  ) {
    return { type: "re-audit" };
  }

  return { type: "unknown" };
}

// ---------------------------------------------------------------------------
// Shared audit helper (unchanged from prior plans)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fix flow helper (FIX-04, FIX-05, D-12)
// ---------------------------------------------------------------------------

/**
 * Run the fix pipeline for either "fix all" or "fix <target>" intents.
 * Posts per-fix confirmations with commit SHA and a final summary table.
 */
async function runFixFlow(
  thread: any,
  raw: GitHubRawMessage,
  intent: { type: "fix-all" } | { type: "fix-finding"; target: string }
): Promise<void> {
  const owner = raw.repository.owner.login;
  const repo = raw.repository.name;
  const prNumber = raw.prNumber;

  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const fixContext: FixContext = {
    owner,
    repo,
    prBranch: pr.head.ref,
    prNumber,
    octokit,
  };

  if (intent.type === "fix-all") {
    const status = await thread.post(
      "Starting auto-fix for all CRITICAL + HIGH findings..."
    );

    const { results, reauditResult } = await fixAll({
      ...fixContext,
      baseBranch: pr.base.ref,
      prTitle: pr.title,
      thread,
      onFixProgress: async (result: FixResult) => {
        if (result.status === "fixed") {
          await thread.post(
            `Fixed: ${result.finding.type} (${result.finding.cweId}) in \`${result.finding.location.file}:${result.finding.location.line}\` -- commit ${result.commitSha?.slice(0, 7)}`
          );
        } else {
          await thread.post(
            `Skipped: ${result.finding.type} (${result.finding.cweId}) -- ${result.error}`
          );
        }
      },
    });

    // Post final summary table (D-12)
    const summaryLines = [
      "## Auto-Fix Results",
      "",
      "| Finding | Status | Commit |",
      "|---------|--------|--------|",
    ];
    for (const r of results) {
      const finding = `${r.finding.type} (${r.finding.cweId})`;
      const statusText = r.status === "fixed" ? "Fixed" : "Skipped";
      const commit = r.commitSha ? r.commitSha.slice(0, 7) : "--";
      summaryLines.push(`| ${finding} | ${statusText} | ${commit} |`);
    }

    if (reauditResult) {
      summaryLines.push("");
      summaryLines.push(
        `Re-audit complete. New score: ${reauditResult.score}/100 (${reauditResult.grade}).`
      );
    }

    await status.edit(summaryLines.join("\n"));

    // Post updated summary card after re-audit (FIX-07)
    if (reauditResult) {
      const newCard = buildSummaryCard(reauditResult, {
        owner,
        repo,
        number: prNumber,
      });
      await thread.post(newCard);
    }
  } else {
    // Single finding fix
    const auditData = await getAuditResult(`${owner}/${repo}/pr/${prNumber}`);
    if (!auditData) {
      await thread.post("No audit results found. Run a security audit first.");
      return;
    }

    // Match finding by type (case-insensitive, partial match)
    const targetLower = intent.target.toLowerCase();
    const finding = auditData.result.allFindings.find(
      (f) =>
        f.type.toLowerCase().includes(targetLower) ||
        f.cweId.toLowerCase() === targetLower
    );

    if (!finding) {
      await thread.post(
        `Could not find a finding matching "${intent.target}". Available findings: ${auditData.result.allFindings.map((f) => f.type).join(", ")}`
      );
      return;
    }

    const status = await thread.post(
      `Fixing: ${finding.type} (${finding.cweId}) in \`${finding.location.file}:${finding.location.line}\`...`
    );

    // Create sandbox for single fix
    const { Sandbox } = await import("@vercel/sandbox");
    const sandbox = await Sandbox.create({
      source: {
        type: "git",
        url: `https://github.com/${owner}/${repo}`,
        username: "x-access-token",
        password: process.env.GITHUB_TOKEN!,
        depth: 50,
      },
      timeout: 10 * 60 * 1000,
    });

    try {
      await sandbox.runCommand("git", [
        "fetch",
        "origin",
        fixContext.prBranch,
      ]);
      await sandbox.runCommand("git", ["checkout", fixContext.prBranch]);
      await sandbox.runCommand("npm", ["install", "--ignore-scripts"]);

      const result = await fixFinding(sandbox, finding, fixContext);

      if (result.status === "fixed") {
        await status.edit(
          `Fixed: ${result.finding.type} (${result.finding.cweId}) in \`${result.finding.location.file}:${result.finding.location.line}\` -- commit ${result.commitSha?.slice(0, 7)}`
        );
      } else {
        await status.edit(
          `Could not auto-fix: ${result.finding.type} (${result.finding.cweId}) -- ${result.error}`
        );
      }
    } finally {
      await sandbox.stop();
    }
  }
}

// ---------------------------------------------------------------------------
// Bot handlers
// ---------------------------------------------------------------------------

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
  const body = raw.comment?.body ?? "";
  const botName = process.env.GITHUB_BOT_USERNAME || "clawguard";

  const intent = detectIntent(body, botName);

  if (intent.type === "unknown") return;

  try {
    if (intent.type === "fix-all" || intent.type === "fix-finding") {
      await runFixFlow(thread, raw, intent);
    } else if (intent.type === "re-audit") {
      const status = await thread.post(
        "## \uD83D\uDEE1\uFE0F ClawGuard Security Audit\n\n\u2B1C Phase 1: Code Quality Review\n\u2B1C Phase 2: Vulnerability Scan\n\u2B1C Phase 3: Threat Model"
      );
      await runAuditAndPost(thread, raw, status);
    }
  } catch (error) {
    console.error("[bot] Error:", error);
    await thread.post(
      "\u274C Something went wrong. Please try again."
    );
  }
});

// Action handler for future platform support (D-02)
bot.onAction("fix-all", async (event) => {
  const thread = event.thread;
  if (!thread) return;

  const raw = event.raw as GitHubRawMessage;
  try {
    await runFixFlow(thread, raw, { type: "fix-all" });
  } catch (error) {
    console.error("[bot] onAction error:", error);
    await thread.post(
      "\u274C Something went wrong during auto-fix. Please try again."
    );
  }
});
