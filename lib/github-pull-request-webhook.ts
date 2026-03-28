import { Octokit } from "@octokit/rest";
import { loadRepoConfig } from "@/lib/config";
import { DEFAULT_CLAWGUARD_CONFIG } from "@/lib/config/defaults";
import { runAuditPipeline } from "@/lib/github-audit-runner";
import {
  isAuditCooldownActive,
  releaseAuditLock,
  setAuditCooldown,
  tryAcquireAuditLock,
} from "@/lib/auto-trigger-redis";

type WaitUntil = (task: Promise<unknown>) => void;

/**
 * GitHub `pull_request` events: optional automatic audit (config `trigger.mode`).
 */
export async function handlePullRequestEvent(
  body: Record<string, unknown>,
  waitUntil: WaitUntil
): Promise<Response> {
  const action = body.action as string | undefined;
  if (
    action !== "opened" &&
    action !== "synchronize" &&
    action !== "reopened" &&
    action !== "ready_for_review"
  ) {
    return new Response("OK", { status: 200 });
  }

  const pr = body.pull_request as Record<string, unknown> | undefined;
  if (!pr) return new Response("OK", { status: 200 });

  const repo = body.repository as Record<string, unknown> | undefined;
  const head = pr.head as Record<string, unknown> | undefined;
  const ownerLogin = (repo?.owner as Record<string, unknown> | undefined)?.login as
    | string
    | undefined;
  const repoName = repo?.name as string | undefined;
  const prNumber = pr.number as number | undefined;
  const headSha = head?.sha as string | undefined;
  const headRef = head?.ref as string | undefined;

  if (
    !ownerLogin ||
    !repoName ||
    prNumber == null ||
    !headSha ||
    !headRef
  ) {
    return new Response("OK", { status: 200 });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  let cfg = DEFAULT_CLAWGUARD_CONFIG;
  try {
    const loaded = await loadRepoConfig(octokit, ownerLogin, repoName, headRef);
    cfg = loaded.config;
  } catch {
    // use defaults
  }

  const trigger = cfg.trigger;
  if (trigger.mode === "mention") {
    return new Response("OK", { status: 200 });
  }

  const draft = pr.draft === true;
  if (draft && trigger.ignoreDraftPRs) {
    return new Response("OK", { status: 200 });
  }

  const labels =
    (pr.labels as Array<{ name?: string }> | undefined)
      ?.map((l) => l.name)
      .filter((n): n is string => Boolean(n)) ?? [];
  if (trigger.ignoreLabels.some((l) => labels.includes(l))) {
    return new Response("OK", { status: 200 });
  }

  if (action === "synchronize" && !trigger.onPushToExisting) {
    return new Response("OK", { status: 200 });
  }

  if (await isAuditCooldownActive(ownerLogin, repoName, prNumber)) {
    return new Response("OK", { status: 200 });
  }

  const lockTtlSeconds = Math.min(
    7200,
    Math.ceil(cfg.scanning.timeout / 1000) + 120
  );
  const acquired = await tryAcquireAuditLock(
    ownerLogin,
    repoName,
    prNumber,
    headSha,
    lockTtlSeconds
  );
  if (!acquired) {
    return new Response("OK", { status: 200 });
  }

  const task = (async () => {
    try {
      const preloaded = await loadRepoConfig(
        octokit,
        ownerLogin,
        repoName,
        headRef
      );
      const { data: created } = await octokit.issues.createComment({
        owner: ownerLogin,
        repo: repoName,
        issue_number: prNumber,
        body: "## 🛡️ ClawGuard (automatic)\n\nStarting security audit…",
      });
      const commentId = created.id;
      const editor = {
        edit: async (markdown: string) => {
          await octokit.issues.updateComment({
            owner: ownerLogin,
            repo: repoName,
            comment_id: commentId,
            body: markdown,
          });
        },
      };
      await runAuditPipeline(octokit, ownerLogin, repoName, prNumber, editor, {
        preloadedConfig: preloaded,
        summaryFormat: "markdown",
      });
      await setAuditCooldown(
        ownerLogin,
        repoName,
        prNumber,
        trigger.cooldownSeconds
      );
    } catch (e) {
      console.error("[webhook] pull_request audit error:", e);
    } finally {
      await releaseAuditLock(ownerLogin, repoName, prNumber, headSha);
    }
  })();

  waitUntil(task);
  return new Response("OK", { status: 200 });
}
