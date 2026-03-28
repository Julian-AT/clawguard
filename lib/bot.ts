import { Chat } from "chat";
import type { Thread } from "chat";
import { createGitHubAdapter } from "@chat-adapter/github";
import type { GitHubRawMessage } from "@chat-adapter/github";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createRedisState } from "@chat-adapter/state-redis";
import { Octokit } from "@octokit/rest";
import { reviewPullRequest } from "./review";
import type { ProgressCallback } from "./review";
import { storeAuditResult, getAuditResult } from "./redis";
import { formatPipelineStatusMessage } from "./bot-helpers";
import { loadRepoConfig, type LoadRepoConfigResult } from "./config";
import { DEFAULT_CLAWGUARD_CONFIG } from "./config/defaults";
import { formatErrorForUser } from "./errors";
import { buildSummaryCard } from "./cards/summary-card";
import type { AuditResult } from "./analysis/types";
import { fixAll, fixFinding } from "./fix";
import type { FixContext } from "./fix/types";
import type { Intent } from "./intent-types";
import { classifyIntentWithLlm } from "./intent-classifier";
import { checkAuditRateLimits } from "./rate-limit";
import { logAudit } from "./logger";
import { getEstimatedPipelineMs } from "./pipeline-eta";
import { getStreamKey, pushStreamEvent } from "./stream-events";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const botUsername = process.env.GITHUB_BOT_USERNAME || "clawguard";

function createStateAdapter() {
  if (process.env.REDIS_URL) {
    return createRedisState();
  }
  console.warn(
    "[clawguard] REDIS_URL not set; using in-memory state (single-instance only)"
  );
  return createMemoryState();
}

export const bot = new Chat({
  userName: botUsername,
  adapters: {
    github: createGitHubAdapter({
      userName: botUsername,
    }),
  },
  state: createStateAdapter(),
});

export type { Intent } from "./intent-types";

export function detectIntent(body: string, botName: string): Intent {
  const lower = body.toLowerCase();
  const mention = `@${botName.toLowerCase()}`;

  if (!lower.includes(mention)) return { type: "unknown" };

  const afterMention = lower.split(mention).pop()?.trim() ?? "";

  if (
    afterMention.startsWith("fix all") ||
    afterMention.includes("fix all critical")
  ) {
    return { type: "fix-all" };
  }

  const fixMatch = afterMention.match(/^fix\s+(.+)/);
  if (fixMatch) {
    return { type: "fix-finding", target: fixMatch[1].trim() };
  }

  if (
    afterMention.startsWith("audit") ||
    afterMention.startsWith("scan") ||
    afterMention.startsWith("review") ||
    afterMention.startsWith("rescan") ||
    afterMention.startsWith("re-audit") ||
    afterMention.startsWith("reaudit")
  ) {
    return { type: "re-audit" };
  }

  return { type: "unknown" };
}

type ThreadPostResult = Awaited<ReturnType<Thread["post"]>>;

async function runAuditAndPost(
  thread: Thread,
  raw: GitHubRawMessage,
  status: ThreadPostResult
): Promise<void> {
  const owner = raw.repository.owner.login;
  const repo = raw.repository.name;
  const prNumber = raw.prNumber;

  const rate = await checkAuditRateLimits({
    installationId: undefined,
    owner,
    repo,
    prNumber,
  });
  if (!rate.ok) {
    await status.edit(`## ClawGuard\n\n${rate.reason}`);
    logAudit("rate-limit", "blocked", { owner, repo, pr: prNumber });
    return;
  }

  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const redisKey = `${owner}/${repo}/pr/${prNumber}`;
  const now = new Date().toISOString();
  const etaHint = await getEstimatedPipelineMs();

  let cfgSummary = "";
  let preloaded: LoadRepoConfigResult | undefined;
  try {
    preloaded = await loadRepoConfig(octokit, owner, repo, pr.head.ref);
    cfgSummary = `Using config: **${preloaded.configSource}** · policies: **${preloaded.policiesSource}** (${preloaded.policies.length} rules)`;
  } catch (e) {
    cfgSummary = `Config load warning: ${formatErrorForUser(e)}`;
  }

  await storeAuditResult({
    key: redisKey,
    data: {
      status: "processing",
      timestamp: now,
      pr: { owner, repo, number: prNumber, title: pr.title },
      pipelineStage: "starting",
      etaMsEstimate: etaHint ?? undefined,
    },
  });

  const streamKey = getStreamKey(owner, repo, prNumber);
  void pushStreamEvent(streamKey, "pipeline:stage", {
    stage: "starting",
    status: "running",
  }).catch(() => {});

  await status.edit(
    `${formatPipelineStatusMessage({
      stage: "recon",
      status: "running",
      detail: "Starting",
    })}\n\n${cfgSummary}`
  );

  const onProgress: ProgressCallback = async (progress) => {
    if (progress.stage === "error") {
      void pushStreamEvent(streamKey, "pipeline:stage", {
        stage: "error",
        status: "running",
      }).catch(() => {});
    } else {
      void pushStreamEvent(streamKey, "pipeline:stage", {
        stage: progress.stage,
        status: progress.status,
      }).catch(() => {});
    }

    await storeAuditResult({
      key: redisKey,
      data: {
        status: "processing",
        timestamp: new Date().toISOString(),
        pr: { owner, repo, number: prNumber, title: pr.title },
        pipelineStage:
          progress.stage === "error" ? "error" : progress.stage,
        etaMsEstimate: etaHint ?? undefined,
      },
    });
    await status.edit(
      `${formatPipelineStatusMessage(progress)}\n\n${cfgSummary}`
    );
  };

  let auditResult: AuditResult;
  try {
    auditResult = await reviewPullRequest(
      {
        owner,
        repo,
        prBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        preloadedConfig: preloaded,
      },
      onProgress
    );
  } catch (error) {
    const msg = formatErrorForUser(error);
    await storeAuditResult({
      key: redisKey,
      data: {
        status: "error",
        timestamp: new Date().toISOString(),
        pr: { owner, repo, number: prNumber, title: pr.title },
        errorMessage: msg,
      },
    });
    await status.edit(
      `${formatPipelineStatusMessage({
        stage: "error",
        error: msg,
      })}\n\n${cfgSummary}\n\nTry again or check ClawGuard deployment logs.`
    );
    throw error;
  }

  const partial = auditResult.metadata?.scanPartialFailure;
  await storeAuditResult({
    key: redisKey,
    data: {
      result: auditResult,
      timestamp: new Date().toISOString(),
      pr: { owner, repo, number: prNumber, title: pr.title },
      status: partial ? "partial_error" : "complete",
      partialErrorMessage: partial
        ? auditResult.metadata?.scanErrorMessage
        : undefined,
    },
  });

  logAudit("audit", "stored", {
    owner,
    repo,
    pr: prNumber,
    partial: partial ? 1 : 0,
  });

  const card = buildSummaryCard(auditResult, {
    owner,
    repo,
    number: prNumber,
  });
  await status.edit(card);
}

async function runFixFlow(
  thread: Thread,
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
      onBatchTableUpdate: async (markdown: string) => {
        await status.edit(markdown);
      },
    });

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

    if (reauditResult) {
      const newCard = buildSummaryCard(reauditResult, {
        owner,
        repo,
        number: prNumber,
      });
      await thread.post(newCard);
    }
  } else {
    const auditData = await getAuditResult(`${owner}/${repo}/pr/${prNumber}`);
    if (!auditData) {
      await thread.post("No audit results found. Run a security audit first.");
      return;
    }

    const targetLower = intent.target.toLowerCase();
    const auditResult = auditData.result;
    if (!auditResult) {
      await thread.post("No audit results found. Run a security audit first.");
      return;
    }

    const finding = auditResult.findings.find(
      (f) =>
        f.type.toLowerCase().includes(targetLower) ||
        f.cweId.toLowerCase() === targetLower
    );

    if (!finding) {
      await thread.post(
        `Could not find a finding matching "${intent.target}". Available findings: ${auditResult.findings.map((f) => f.type).join(", ")}`
      );
      return;
    }

    const status = await thread.post(
      `Fixing: ${finding.type} (${finding.cweId}) in \`${finding.file}:${finding.line}\`...`
    );

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
          `Fixed: ${result.finding.type} (${result.finding.cweId}) in \`${result.finding.file}:${result.finding.line}\` -- commit ${result.commitSha?.slice(0, 7)}`
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

bot.onNewMention(async (thread, message) => {
  const raw = message.raw as GitHubRawMessage;
  const owner = raw.repository.owner.login;
  const repo = raw.repository.name;
  const prNumber = raw.prNumber;

  let autoSubscribe = DEFAULT_CLAWGUARD_CONFIG.bot.autoSubscribe;
  try {
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    const { config } = await loadRepoConfig(octokit, owner, repo, pr.head.ref);
    autoSubscribe = config.bot.autoSubscribe;
  } catch {}

  const status = await thread.post(
    "## 🛡️ ClawGuard Security Audit\n\n⬜ Phase 1: Code Quality Review\n⬜ Phase 2: Vulnerability Scan\n⬜ Phase 3: Threat Model"
  );
  if (autoSubscribe) await thread.subscribe();

  try {
    await runAuditAndPost(thread, raw, status);
  } catch (error) {
    console.error("[bot] Review error:", error);
    await status.edit(
      "## 🛡️ ClawGuard Security Audit\n\n❌ Something went wrong during the security analysis. Please try again."
    );
  }
});

bot.onSubscribedMessage(async (thread, message) => {
  const raw = message.raw as GitHubRawMessage;
  const body = raw.comment?.body ?? "";
  const botName = botUsername;

  let intent = detectIntent(body, botName);
  if (intent.type === "unknown" && body.trim().length > 20) {
    const llm = await classifyIntentWithLlm(body, botName);
    if (llm && llm.type !== "unknown") {
      intent = llm;
    }
  }

  if (intent.type === "unknown") return;

  try {
    if (intent.type === "fix-all" || intent.type === "fix-finding") {
      await runFixFlow(thread, raw, intent);
    } else if (intent.type === "re-audit") {
      const status = await thread.post(
        "## 🛡️ ClawGuard Security Audit\n\n⬜ Phase 1: Code Quality Review\n⬜ Phase 2: Vulnerability Scan\n⬜ Phase 3: Threat Model"
      );
      await runAuditAndPost(thread, raw, status);
    }
  } catch (error) {
    console.error("[bot] Error:", error);
    await thread.post("❌ Something went wrong. Please try again.");
  }
});

bot.onAction("fix-all", async (event) => {
  const thread = event.thread as Thread | null;
  if (!thread) return;

  const raw = event.raw as GitHubRawMessage;
  try {
    await runFixFlow(thread, raw, { type: "fix-all" });
  } catch (error) {
    console.error("[bot] onAction error:", error);
    await thread.post("❌ Something went wrong during auto-fix. Please try again.");
  }
});

bot.onAction("re-audit", async (event) => {
  const thread = event.thread as Thread | null;
  if (!thread) return;

  const raw = event.raw as GitHubRawMessage;
  const status = await thread.post(
    formatPipelineStatusMessage({
      stage: "recon",
      status: "running",
      detail: "Re-audit",
    })
  );
  try {
    await runAuditAndPost(thread, raw, status);
  } catch (error) {
    console.error("[bot] onAction re-audit error:", error);
    await thread.post(
      `❌ Re-audit failed. Please try \`@${botUsername} review\` in a new comment.`
    );
  }
});
