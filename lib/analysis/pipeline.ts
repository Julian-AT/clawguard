import { Sandbox } from "@vercel/sandbox";
import { createBashTool } from "bash-tool";
import { Octokit } from "@octokit/rest";
import { loadRepoConfig, type LoadRepoConfigResult } from "@/lib/config";
import { runReconnaissance } from "./recon";
import { runSecurityScan } from "./security-scan";
import { runThreatSynthesis } from "./threat-synthesis";
import { postProcessAudit } from "./post-process";
import type { AuditResult, PhaseResult, ReconResult } from "./types";
import {
  getEstimatedPipelineMs,
  recordPipelineDurationMs,
} from "@/lib/pipeline-eta";
import { logAudit } from "@/lib/logger";

export type PipelineProgress =
  | { stage: "recon"; status: "running" | "complete"; detail?: string }
  | {
      stage: "security-scan";
      status: "running" | "complete";
      step?: number;
      detail?: string;
    }
  | { stage: "threat-synthesis"; status: "running" | "complete"; detail?: string }
  | { stage: "post-processing"; status: "running" | "complete"; detail?: string }
  | { stage: "error"; error: string };

export type ProgressCallback = (progress: PipelineProgress) => Promise<void>;

export interface PipelineInput {
  owner: string;
  repo: string;
  prBranch: string;
  baseBranch: string;
  /** When set, skips a second loadRepoConfig call (same ref as prBranch). */
  preloadedConfig?: LoadRepoConfigResult;
}

export async function runSecurityPipeline(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<AuditResult> {
  const started = Date.now();
  const etaMs = await getEstimatedPipelineMs();
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const { config, policies, configSource, policiesSource } =
    input.preloadedConfig ??
    (await loadRepoConfig(octokit, input.owner, input.repo, input.prBranch));

  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${input.owner}/${input.repo}`,
      username: "x-access-token",
      password: process.env.GITHUB_TOKEN!,
      depth: 50,
    },
    timeout: config.scanning.timeout,
  });

  let recon: ReconResult;

  try {
    await sandbox.runCommand("git", [
      "fetch",
      "origin",
      input.prBranch,
      input.baseBranch,
    ]);
    await sandbox.runCommand("git", ["checkout", input.prBranch]);

    const diffResult = await sandbox.runCommand("git", [
      "diff",
      `origin/${input.baseBranch}...HEAD`,
    ]);
    const diff = await diffResult.stdout();

    await onProgress?.({
      stage: "recon",
      status: "running",
      detail: "Mapping diff and file context",
    });
    recon = await runReconnaissance(sandbox, diff, config);
    await onProgress?.({ stage: "recon", status: "complete" });

    const { tools } = await createBashTool({ sandbox });

    await onProgress?.({
      stage: "security-scan",
      status: "running",
      detail: "Deep vulnerability scan",
    });
    const scan = await runSecurityScan(
      tools,
      recon,
      policies,
      config,
      ({ stepCount, detail }) => {
        void onProgress?.({
          stage: "security-scan",
          status: "running",
          step: stepCount,
          detail: detail ?? `Agent step ${stepCount}`,
        });
      }
    );
    await onProgress?.({ stage: "security-scan", status: "complete" });

    await onProgress?.({
      stage: "threat-synthesis",
      status: "running",
      detail: "Threat model & deduplication",
    });
    const threat = await runThreatSynthesis(
      tools,
      recon,
      scan.findings,
      scan.summary,
      config
    );
    await onProgress?.({ stage: "threat-synthesis", status: "complete" });

    await onProgress?.({ stage: "post-processing", status: "running" });
    const processed = postProcessAudit({
      findings: threat.findings,
      threatModel: threat.threatModel,
      summary: threat.summary,
      recon,
      config,
    });
    await onProgress?.({ stage: "post-processing", status: "complete" });

    const phases: PhaseResult[] = [
      {
        phase: "security-scan",
        findings: scan.findings,
        summary: scan.summary,
      },
      {
        phase: "threat-model",
        findings: threat.findings,
        summary: threat.summary,
      },
    ];

    const metaNote = `config:${configSource},policies:${policiesSource}`;
    const durationMs = Date.now() - started;
    await recordPipelineDurationMs(durationMs);

    let summaryOut = processed.summary;
    if (scan.partialFailure && scan.scanErrorMessage) {
      summaryOut = `${summaryOut}\n\n[Scan warning] ${scan.scanErrorMessage}`;
    }

    logAudit("audit", "pipeline_complete", {
      owner: input.owner,
      repo: input.repo,
      durationMs,
      partial: scan.partialFailure ? 1 : 0,
    });

    return {
      score: processed.score,
      grade: processed.grade,
      summary: summaryOut,
      phases,
      findings: processed.findings,
      threatModel: processed.threatModel,
      recon,
      metadata: {
        timestamp: new Date().toISOString(),
        filesChanged: recon.changedFiles.length,
        linesChanged: recon.linesChanged ?? 0,
        modelUsed: config.model.model,
        pipelineDurationMs: durationMs,
        configFingerprint: metaNote,
        scanPartialFailure: scan.partialFailure,
        scanErrorMessage: scan.scanErrorMessage,
        pipelineEtaMsEstimate: etaMs ?? undefined,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await onProgress?.({ stage: "error", error: msg });
    throw e;
  } finally {
    await sandbox.stop();
  }
}
