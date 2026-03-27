import { Sandbox } from "@vercel/sandbox";
import { createBashTool } from "bash-tool";
import { runQualityReview } from "./phase1-quality";
import { runVulnerabilityScan } from "./phase2-vuln";
import { runThreatModel } from "./phase3-threat";
import { calculateScore, countBySeverity } from "./scoring";
import type { AuditResult } from "./types";

export type ProgressCallback = (
  phase: "quality" | "vulnerability" | "threatModel",
  status: "running" | "complete" | "error"
) => Promise<void>;

export interface PipelineInput {
  owner: string;
  repo: string;
  prBranch: string;
  baseBranch: string;
}

/**
 * Run the 3-phase security analysis pipeline.
 *
 * Creates a single Vercel Sandbox, clones the repo, and runs three sequential
 * ToolLoopAgent phases: code quality review, vulnerability scan, and threat model.
 * Each phase receives context from prior phases for cumulative analysis.
 *
 * @param input - PR details (owner, repo, branches)
 * @param onProgress - Optional callback for phase transition updates
 * @returns Aggregated AuditResult with findings, score, and grade
 */
export async function runSecurityPipeline(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<AuditResult> {
  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${input.owner}/${input.repo}`,
      username: "x-access-token",
      password: process.env.GITHUB_TOKEN!,
      depth: 50,
    },
    timeout: 10 * 60 * 1000, // 10 minutes for 3-phase analysis
  });

  try {
    // Fetch and checkout PR branch
    await sandbox.runCommand("git", [
      "fetch",
      "origin",
      input.prBranch,
      input.baseBranch,
    ]);
    await sandbox.runCommand("git", ["checkout", input.prBranch]);

    // Get the diff once, share across all phases
    const diffResult = await sandbox.runCommand("git", [
      "diff",
      `origin/${input.baseBranch}...HEAD`,
    ]);
    const diff = await diffResult.stdout();

    // Create bash tools for agents to explore the codebase
    const { tools } = await createBashTool({ sandbox });

    // Phase 1: Code Quality Review
    await onProgress?.("quality", "running");
    const phase1 = await runQualityReview(tools, diff);
    await onProgress?.("quality", "complete");

    // Phase 2: Vulnerability Scan (receives Phase 1 context)
    await onProgress?.("vulnerability", "running");
    const phase2 = await runVulnerabilityScan(tools, diff, phase1.summary);
    await onProgress?.("vulnerability", "complete");

    // Phase 3: Threat Model (receives Phase 1 + Phase 2 context)
    await onProgress?.("threatModel", "running");
    const phase3 = await runThreatModel(
      tools,
      diff,
      phase1.summary,
      phase2.summary
    );
    await onProgress?.("threatModel", "complete");

    // Aggregate findings from all phases
    const allFindings = [
      ...phase1.findings,
      ...phase2.findings,
      ...phase3.findings,
    ];

    // Calculate score and grade
    const { score, grade } = calculateScore(allFindings);
    const severityCounts = countBySeverity(allFindings);

    return {
      phases: {
        quality: phase1,
        vulnerability: phase2,
        threatModel: phase3,
      },
      allFindings,
      score,
      grade,
      severityCounts,
    };
  } finally {
    await sandbox.stop();
  }
}
