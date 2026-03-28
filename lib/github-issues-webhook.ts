import { Octokit } from "@octokit/rest";
import { loadRepoConfig } from "@/lib/config";
import { DEFAULT_CLAWGUARD_CONFIG } from "@/lib/config/defaults";
import { appendLearningRepo, extractLearningFromComment } from "@/lib/learnings";
import { correlateIssueToPrediction } from "@/lib/tracking/correlator";
import { recordFalsePositive, recordMiss, recordTruePositive } from "@/lib/tracking/metrics";
import { getPredictions } from "@/lib/tracking/predictions";

type WaitUntil = (task: Promise<unknown>) => void;

/**
 * Correlate labeled bug issues with prior audit predictions (post-merge feedback loop).
 */
export async function handleIssuesEvent(
  body: Record<string, unknown>,
  waitUntil: WaitUntil,
): Promise<Response> {
  const action = body.action as string | undefined;
  if (action !== "opened" && action !== "labeled") {
    return new Response("OK", { status: 200 });
  }

  const issue = body.issue as Record<string, unknown> | undefined;
  const repo = body.repository as Record<string, unknown> | undefined;
  const ownerLogin = (repo?.owner as Record<string, unknown> | undefined)?.login as
    | string
    | undefined;
  const repoName = repo?.name as string | undefined;
  if (!issue || !ownerLogin || !repoName) {
    return new Response("OK", { status: 200 });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  let cfg = DEFAULT_CLAWGUARD_CONFIG;
  try {
    const { data: repoData } = await octokit.repos.get({
      owner: ownerLogin,
      repo: repoName,
    });
    const loaded = await loadRepoConfig(octokit, ownerLogin, repoName, repoData.default_branch);
    cfg = loaded.config;
  } catch {
    // defaults
  }

  if (!cfg.tracking.enabled) {
    return new Response("OK", { status: 200 });
  }

  const labels = (issue.labels as Array<{ name?: string }> | undefined)
    ?.map((l) => l.name)
    .filter(Boolean) as string[] | undefined;
  const bugHit =
    labels?.some((l) => cfg.tracking.bugLabels.some((b) => b.toLowerCase() === l.toLowerCase())) ??
    false;
  if (!bugHit) {
    return new Response("OK", { status: 200 });
  }

  const title = (issue.title as string) ?? "";
  const issueBody = (issue.body as string) ?? "";
  const bodyText = `${title}\n${issueBody}`;
  const prMatch = bodyText.match(/#(\d+)\b/);
  const prNumber = prMatch ? parseInt(prMatch[1], 10) : NaN;
  if (!Number.isFinite(prNumber)) {
    return new Response("OK", { status: 200 });
  }

  const task = (async () => {
    const pred = await getPredictions(ownerLogin, repoName, prNumber);
    if (!pred) return;
    if (pred.fingerprints.length === 0) {
      await recordMiss(ownerLogin, repoName);
      return;
    }
    const conf = correlateIssueToPrediction(title, issueBody, pred);
    if (conf >= cfg.tracking.correlationConfidenceThreshold) {
      await recordTruePositive(ownerLogin, repoName);
      const extracted = await extractLearningFromComment(
        `Bug report correlated with prior ClawGuard finding (confidence ${conf.toFixed(2)}): ${bodyText.slice(0, 1500)}`,
      );
      if (extracted && cfg.learnings.enabled) {
        await appendLearningRepo(ownerLogin, repoName, {
          pattern: extracted.pattern,
          context: extracted.context,
          action: extracted.action,
          confidence: conf,
          sourcePr: prNumber,
        });
      }
    } else {
      await recordFalsePositive(ownerLogin, repoName);
    }
  })();

  waitUntil(task);
  return new Response("OK", { status: 200 });
}
