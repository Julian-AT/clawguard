import type { Octokit } from "@octokit/rest";
import type { AuditResult } from "./analysis/types";
import { formatPipelineStatusMessage } from "./bot-helpers";
import { buildSummaryCard, buildSummaryMarkdown } from "./cards/summary-card";
import { type LoadRepoConfigResult, loadRepoConfig } from "./config";
import { formatErrorForUser } from "./errors";
import { logAudit } from "./logger";
import { getEstimatedPipelineMs } from "./pipeline-eta";
import { checkAuditRateLimits } from "./rate-limit";
import { storeAuditResult } from "./redis";
import type { ProgressCallback } from "./review";
import { reviewPullRequest } from "./review";
import { getStreamKey, pushStreamEvent } from "./stream-events";

/** Minimal interface for updating PR thread status (Chat SDK thread or GitHub comment). */
export interface AuditStatusEditor {
  /** Markdown strings, Chat card JSX, or GFM for Issues API. */
  edit(body: unknown): Promise<void>;
}

/**
 * Runs the full security pipeline and updates the status editor with progress and final card.
 * Used by @mention flows and automatic pull_request webhooks.
 */
export async function runAuditPipeline(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  status: AuditStatusEditor,
  options?: {
    preloadedConfig?: LoadRepoConfigResult;
    /** `markdown` for GitHub Issues API comments; default `jsx` for Chat SDK cards. */
    summaryFormat?: "jsx" | "markdown";
  },
): Promise<void> {
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
  let preloaded: LoadRepoConfigResult | undefined = options?.preloadedConfig;
  try {
    preloaded = preloaded ?? (await loadRepoConfig(octokit, owner, repo, pr.head.ref));
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
    })}\n\n${cfgSummary}`,
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
        pipelineStage: progress.stage === "error" ? "error" : progress.stage,
        etaMsEstimate: etaHint ?? undefined,
      },
    });
    await status.edit(`${formatPipelineStatusMessage(progress)}\n\n${cfgSummary}`);
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
        prNumber,
      },
      onProgress,
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
      })}\n\n${cfgSummary}\n\nTry again or check ClawGuard deployment logs.`,
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
      partialErrorMessage: partial ? auditResult.metadata?.scanErrorMessage : undefined,
    },
  });

  logAudit("audit", "stored", {
    owner,
    repo,
    pr: prNumber,
    partial: partial ? 1 : 0,
  });

  const format = options?.summaryFormat ?? "jsx";
  if (format === "markdown") {
    await status.edit(
      buildSummaryMarkdown(auditResult, {
        owner,
        repo,
        number: prNumber,
      }),
    );
  } else {
    const card = buildSummaryCard(auditResult, {
      owner,
      repo,
      number: prNumber,
    });
    await status.edit(card);
  }
}
