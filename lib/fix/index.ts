import { Sandbox } from "@vercel/sandbox";
import type { Thread } from "chat";
import type { Finding, AuditResult } from "@/lib/analysis/types";
import type { FixResult, FixContext } from "@/lib/fix/types";
import { applyStoredFix } from "@/lib/fix/apply";
import { generateFixWithAgent } from "@/lib/fix/agent";
import {
  commitBatchFixesToGitHub,
  commitFixToGitHub,
} from "@/lib/fix/commit";
import { reviewPullRequest } from "@/lib/review";
import { getAuditResult, storeAuditResult } from "@/lib/redis";
import { SEVERITY_ORDER } from "@/lib/constants";

type PrepareResult = {
  status: "fixed" | "skipped";
  tier: "fast" | "agent";
  error?: string;
  content?: string;
};

async function prepareFindingFix(
  sandbox: Sandbox,
  finding: Finding
): Promise<PrepareResult> {
  try {
    const fastResult = await applyStoredFix(sandbox, finding);
    if (fastResult.valid) {
      return { status: "fixed", tier: "fast", content: fastResult.content };
    }

    const agentResult = await generateFixWithAgent(
      sandbox,
      finding,
      fastResult.errors
    );

    if (agentResult.valid) {
      return { status: "fixed", tier: "agent", content: agentResult.content };
    }

    return {
      status: "skipped",
      tier: "agent",
      error: `Validation failed after both tiers: ${agentResult.errors}`,
    };
  } catch (error) {
    return {
      status: "skipped",
      tier: "fast",
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}

/**
 * Fix a single finding using a tiered approach:
 * 1. Fast path: apply stored fix.before/fix.after (D-05)
 * 2. Agent fallback: generate fix with ToolLoopAgent (D-06)
 *
 * Commits validated fix to PR branch via Octokit Contents API (FIX-03).
 * Returns skipped status if both tiers fail (D-10).
 */
export async function fixFinding(
  sandbox: Sandbox,
  finding: Finding,
  context: FixContext
): Promise<FixResult> {
  const prep = await prepareFindingFix(sandbox, finding);
  if (prep.status === "fixed" && prep.content) {
    const sha = await commitFixToGitHub(context.octokit, {
      owner: context.owner,
      repo: context.repo,
      branch: context.prBranch,
      filePath: finding.file,
      content: prep.content,
      finding,
    });

    return {
      finding,
      status: "fixed",
      commitSha: sha,
      tier: prep.tier,
    };
  }

  return {
    finding,
    status: "skipped",
    error: prep.error ?? "Unknown error",
    tier: prep.tier,
  };
}

/**
 * Fix all CRITICAL + HIGH findings sequentially in a single sandbox (D-11).
 * Applies all fixes locally, then **one** Git commit for all changed files.
 */
export async function fixAll(
  context: FixContext & {
    baseBranch: string;
    prTitle: string;
    /** Reserved for progress UI / future streaming */
    thread?: Thread;
    onFixProgress?: (result: FixResult) => Promise<void>;
  }
): Promise<{
  results: FixResult[];
  reauditResult?: AuditResult;
}> {
  const auditData = await getAuditResult(
    `${context.owner}/${context.repo}/pr/${context.prNumber}`
  );

  if (!auditData?.result) {
    throw new Error("No audit results found");
  }

  const { result: auditResult } = auditData;

  const fixable = auditResult.findings
    .filter((f) => ["CRITICAL", "HIGH"].includes(f.severity))
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 99) -
        (SEVERITY_ORDER[b.severity] ?? 99)
    );

  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${context.owner}/${context.repo}`,
      username: "x-access-token",
      password: process.env.GITHUB_TOKEN!,
      depth: 50,
    },
    timeout: 10 * 60 * 1000,
  });

  const results: FixResult[] = [];
  const pendingFiles = new Map<string, string>();
  const fixedFindings: Finding[] = [];

  try {
    await sandbox.runCommand("git", ["fetch", "origin", context.prBranch]);
    await sandbox.runCommand("git", ["checkout", context.prBranch]);
    await sandbox.runCommand("npm", ["install", "--ignore-scripts"]);

    for (const finding of fixable) {
      const prep = await prepareFindingFix(sandbox, finding);
      if (prep.status === "skipped") {
        const res: FixResult = {
          finding,
          status: "skipped",
          error: prep.error,
          tier: prep.tier,
        };
        results.push(res);
        await context.onFixProgress?.(res);
        continue;
      }

      pendingFiles.set(finding.file, prep.content!);
      fixedFindings.push(finding);
      results.push({
        finding,
        status: "fixed",
        tier: prep.tier,
      });
    }

    if (pendingFiles.size > 0) {
      const batchSha = await commitBatchFixesToGitHub(context.octokit, {
        owner: context.owner,
        repo: context.repo,
        branch: context.prBranch,
        files: pendingFiles,
        findings: fixedFindings,
      });
      for (const r of results) {
        if (r.status === "fixed") {
          r.commitSha = batchSha;
        }
      }
      for (const r of results) {
        if (r.status === "fixed") {
          await context.onFixProgress?.(r);
        }
      }
    }
  } finally {
    await sandbox.stop();
  }

  if (results.some((r) => r.status === "fixed")) {
    const reauditResult = await reviewPullRequest({
      owner: context.owner,
      repo: context.repo,
      prBranch: context.prBranch,
      baseBranch: context.baseBranch,
    });

    await storeAuditResult({
      key: `${context.owner}/${context.repo}/pr/${context.prNumber}`,
      data: {
        result: reauditResult,
        timestamp: new Date().toISOString(),
        pr: {
          owner: context.owner,
          repo: context.repo,
          number: context.prNumber,
          title: context.prTitle,
        },
        status: "complete",
      },
    });

    return { results, reauditResult };
  }

  return { results };
}
