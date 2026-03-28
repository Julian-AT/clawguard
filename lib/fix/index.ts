import { Sandbox } from "@vercel/sandbox";
import type { Finding, AuditResult } from "@/lib/analysis/types";
import type { FixResult, FixContext } from "@/lib/fix/types";
import { applyStoredFix } from "@/lib/fix/apply";
import { generateFixWithAgent } from "@/lib/fix/agent";
import { commitFixToGitHub } from "@/lib/fix/commit";
import { reviewPullRequest } from "@/lib/review";
import { getAuditResult, storeAuditResult } from "@/lib/redis";
import { SEVERITY_ORDER } from "@/lib/cards/summary-card";

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
  try {
    // 1. Try fast path: apply stored fix (D-04, D-05)
    const fastResult = await applyStoredFix(sandbox, finding);

    if (fastResult.valid) {
      // Fast path succeeded -- commit the fix
      const sha = await commitFixToGitHub(context.octokit, {
        owner: context.owner,
        repo: context.repo,
        branch: context.prBranch,
        filePath: finding.location.file,
        content: fastResult.content,
        finding,
      });

      return {
        finding,
        status: "fixed",
        commitSha: sha,
        tier: "fast",
      };
    }

    // 2. Fast path failed -- try agent fallback (D-06)
    const agentResult = await generateFixWithAgent(
      sandbox,
      finding,
      fastResult.errors
    );

    if (agentResult.valid) {
      // Agent fix succeeded -- commit it
      const sha = await commitFixToGitHub(context.octokit, {
        owner: context.owner,
        repo: context.repo,
        branch: context.prBranch,
        filePath: finding.location.file,
        content: agentResult.content,
        finding,
      });

      return {
        finding,
        status: "fixed",
        commitSha: sha,
        tier: "agent",
      };
    }

    // 3. Both tiers failed (D-10)
    return {
      finding,
      status: "skipped",
      error: `Validation failed after both tiers: ${agentResult.errors}`,
      tier: "agent",
    };
  } catch (error) {
    // Unexpected error -- skip gracefully
    return {
      finding,
      status: "skipped",
      error:
        error instanceof Error ? error.message : "Unexpected error",
      tier: "fast",
    };
  }
}

/**
 * Fix all CRITICAL + HIGH findings sequentially in a single sandbox (D-11).
 *
 * Flow:
 * 1. Load audit data from Redis (FIX-05)
 * 2. Filter and sort fixable findings (CRITICAL first)
 * 3. Create sandbox, checkout PR branch, install deps
 * 4. Process each finding via fixFinding (tiered approach)
 * 5. After all fixes, run re-audit (FIX-06) and store results (FIX-07)
 */
export async function fixAll(
  context: FixContext & {
    baseBranch: string;
    prTitle: string;
    thread: any;
    onFixProgress?: (result: FixResult) => Promise<void>;
  }
): Promise<{
  results: FixResult[];
  reauditResult?: AuditResult;
}> {
  // 1. Load audit data from Redis
  const auditData = await getAuditResult(
    `${context.owner}/${context.repo}/pr/${context.prNumber}`
  );

  if (!auditData) {
    throw new Error("No audit results found");
  }

  // 2. Filter for CRITICAL and HIGH severity findings
  const fixable = auditData.result.allFindings
    .filter((f) => ["CRITICAL", "HIGH"].includes(f.severity))
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 99) -
        (SEVERITY_ORDER[b.severity] ?? 99)
    );

  // 3. Create sandbox with git source (single sandbox for all fixes)
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

  try {
    // 4. Checkout PR branch and install dependencies
    await sandbox.runCommand("git", ["fetch", "origin", context.prBranch]);
    await sandbox.runCommand("git", ["checkout", context.prBranch]);
    await sandbox.runCommand("npm", ["install", "--ignore-scripts"]);

    // 5. Process each finding sequentially
    for (const finding of fixable) {
      const result = await fixFinding(sandbox, finding, context);
      results.push(result);

      // Report progress
      await context.onFixProgress?.(result);

      // If fixed, pull changes so sandbox stays in sync
      if (result.status === "fixed") {
        await sandbox.runCommand("git", ["pull", "origin", context.prBranch]);
      }
    }
  } finally {
    // 6. Always stop sandbox
    await sandbox.stop();
  }

  // 7. Re-audit if any fixes were committed (FIX-06)
  if (results.some((r) => r.status === "fixed")) {
    const reauditResult = await reviewPullRequest({
      owner: context.owner,
      repo: context.repo,
      prBranch: context.prBranch,
      baseBranch: context.baseBranch,
    });

    // Store updated results (FIX-07)
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

  // No fixes committed -- no re-audit needed
  return { results };
}
