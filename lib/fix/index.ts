import { Sandbox } from "@vercel/sandbox";
import type { Thread } from "chat";
import type { AuditResult, Finding } from "@/lib/analysis/types";
import { SEVERITY_ORDER } from "@/lib/constants";
import { generateFixWithAgent } from "@/lib/fix/agent";
import { applyStoredFix } from "@/lib/fix/apply";
import { commitBatchFixesToGitHub, commitFixToGitHub } from "@/lib/fix/commit";
import type { FixContext, FixResult } from "@/lib/fix/types";
import { getAuditResult, storeAuditResult } from "@/lib/redis";
import { reviewPullRequest } from "@/lib/review";

function buildFixProgressMarkdown(results: FixResult[]): string {
  const lines = [
    "## ClawGuard Auto-Fix Progress",
    "",
    "| Finding | Status | Commit |",
    "|---------|--------|--------|",
  ];
  for (const r of results) {
    const finding = `${r.finding.type} (${r.finding.cweId})`;
    const statusText = r.status === "fixed" ? "Fixed" : "Skipped";
    const commit = r.commitSha ? r.commitSha.slice(0, 7) : "—";
    lines.push(`| ${finding} | ${statusText} | ${commit} |`);
  }
  return lines.join("\n");
}

type PrepareResult = {
  status: "fixed" | "skipped";
  tier: "fast" | "agent";
  error?: string;
  content?: string;
};

async function prepareFindingFix(sandbox: Sandbox, finding: Finding): Promise<PrepareResult> {
  try {
    const fastResult = await applyStoredFix(sandbox, finding);
    if (fastResult.valid) {
      return { status: "fixed", tier: "fast", content: fastResult.content };
    }

    const agentResult = await generateFixWithAgent(sandbox, finding, fastResult.errors);

    if (agentResult.valid) {
      return { status: "fixed", tier: "agent", content: agentResult.content };
    }

    return {
      status: "skipped",
      tier: "agent",
      error: `Validation failed after both tiers: ${agentResult.errors}`,
    };
  } catch (error) {
    const { handleError } = await import("@/lib/error-handler");
    handleError(error, { operation: "prepareFindingFix", agentName: "fix-agent" });
    return {
      status: "skipped",
      tier: "fast",
      error: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}

export async function fixFinding(
  sandbox: Sandbox,
  finding: Finding,
  context: FixContext,
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

export async function fixAll(
  context: FixContext & {
    baseBranch: string;
    prTitle: string;
    thread?: Thread;
    onBatchTableUpdate?: (markdown: string) => Promise<void>;
  },
): Promise<{
  results: FixResult[];
  reauditResult?: AuditResult;
}> {
  const auditData = await getAuditResult(`${context.owner}/${context.repo}/pr/${context.prNumber}`);

  if (!auditData?.result) {
    throw new Error("No audit results found");
  }

  const { result: auditResult } = auditData;

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GITHUB_TOKEN is required to run fixes in the sandbox");
  }

  const fixable = auditResult.findings
    .filter((f) => ["CRITICAL", "HIGH"].includes(f.severity))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99));

  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${context.owner}/${context.repo}`,
      username: "x-access-token",
      password: githubToken,
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
        await context.onBatchTableUpdate?.(buildFixProgressMarkdown(results));
        continue;
      }

      if (!prep.content) {
        throw new Error(`Missing prepared content for finding in ${finding.file}`);
      }
      pendingFiles.set(finding.file, prep.content);
      fixedFindings.push(finding);
      results.push({
        finding,
        status: "fixed",
        tier: prep.tier,
      });
      await context.onBatchTableUpdate?.(buildFixProgressMarkdown(results));
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
      await context.onBatchTableUpdate?.(buildFixProgressMarkdown(results));
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
