import { randomUUID } from "node:crypto";
import { Octokit } from "@octokit/rest";
import { Sandbox } from "@vercel/sandbox";
import { createBashTool } from "bash-tool";
import { AgentOrchestrator } from "@/lib/agents";
import { getAllAgents } from "@/lib/agents/registry";
import type { OrchestratorResult } from "@/lib/agents/types";
import { type LoadRepoConfigResult, loadRepoConfig } from "@/lib/config";
import type { ClawGuardConfig } from "@/lib/config/schemas";
import { getKnowledgeBlockForScan } from "@/lib/knowledge";
import { getLearningsBlockForScan } from "@/lib/learnings";
import { logAudit } from "@/lib/logger";
import { getEstimatedPipelineMs, recordPipelineDurationMs } from "@/lib/pipeline-eta";
import { storeAuditPredictions } from "@/lib/tracking/predictions";
import { runChangeAnalysis } from "./change-analysis";
import { postProcessAudit } from "./post-process";
import { runReconnaissance } from "./recon";
import { runThreatSynthesis } from "./threat-synthesis";
import type {
  AuditResult,
  Finding,
  PhaseResult,
  PRSummary,
  ReviewVerdictResult,
  ReconResult,
  TeamPattern,
} from "./types";

function resolveAgentNames(config: ClawGuardConfig): string[] | undefined {
  const all = getAllAgents();
  if (all.length === 0) return undefined;
  const names = all
    .map((a) => a.name)
    .filter((name) => {
      if (name === "dependency-audit" && !config.scanning.enableDependencyAudit) return false;
      if (name === "secret-scanner" && !config.scanning.enableSecretScan) return false;
      return true;
    });
  return names;
}

function aggregateScanFromOrchestrator(orchestratorResult: OrchestratorResult): {
  findings: OrchestratorResult["findings"];
  summary: string;
  partialFailure: boolean;
  scanErrorMessage?: string;
} {
  const partialFailure =
    orchestratorResult.errors.length > 0 ||
    orchestratorResult.agentResults.some((r) => r.error);
  const parts = [
    ...orchestratorResult.errors.map((e) => `${e.agent}: ${e.error}`),
    ...orchestratorResult.agentResults.filter((r) => r.error).map((r) => `${r.agentName}: ${r.error}`),
  ].filter(Boolean);
  return {
    findings: orchestratorResult.findings,
    summary:
      orchestratorResult.summary ||
      orchestratorResult.agentResults.map((r) => r.summary).join("\n\n") ||
      "Multi-agent scan completed.",
    partialFailure,
    scanErrorMessage: parts.length ? parts.join("; ") : undefined,
  };
}

export type PipelineProgress =
  | { stage: "recon"; status: "running" | "complete"; detail?: string }
  | {
      stage: "change-analysis";
      status: "running" | "complete";
      detail?: string;
    }
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
  /** Enables post-merge prediction storage when `tracking` is enabled. */
  prNumber?: number;
  /** Correlates logs, SSE, and orchestrator runs */
  runId?: string;
  /** Real-time report stream (Redis SSE) */
  onStreamEvent?: (event: string, payload: unknown) => void;
}

export async function runSecurityPipeline(
  input: PipelineInput,
  onProgress?: ProgressCallback,
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
    await sandbox.runCommand("git", ["fetch", "origin", input.prBranch, input.baseBranch]);
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

    const learningsBlock = await getLearningsBlockForScan(input.owner, input.repo, config);
    const knowledgeBlock = await getKnowledgeBlockForScan(input.owner, config);

    const runId = input.runId ?? randomUUID();

    await onProgress?.({
      stage: "security-scan",
      status: "running",
      detail: "Multi-agent vulnerability scan",
    });

    const orchestrator = new AgentOrchestrator();
    const orchestratorResult = await orchestrator.run({
      runId,
      sandbox,
      recon,
      config,
      policies,
      owner: input.owner,
      repo: input.repo,
      learningsBlock,
      knowledgeBlock,
      agentNames: resolveAgentNames(config),
      onStreamEvent: input.onStreamEvent,
      onAgentStep: (info) => {
        void onProgress?.({
          stage: "security-scan",
          status: "running",
          detail: `${info.agentName}: ${info.detail ?? `step ${info.stepCount}`}`,
        });
      },
    });

    const scan = aggregateScanFromOrchestrator(orchestratorResult);
    await onProgress?.({ stage: "security-scan", status: "complete" });

    const learningsResult = orchestratorResult.agentResults.find((r) => r.agentName === "learnings");
    const learningsMeta = learningsResult?.metadata as
      | {
          finalFindings?: Finding[];
          verdict?: ReviewVerdictResult;
          teamPatterns?: TeamPattern[];
        }
      | undefined;
    const findingsAfterLearnings =
      learningsMeta?.finalFindings !== undefined ? learningsMeta.finalFindings : scan.findings;

    await onProgress?.({
      stage: "change-analysis",
      status: "running",
      detail: config.analysis.generatePRSummary ? "PR summary (agent + fallback)" : "Skipped",
    });
    let prSummary: PRSummary | undefined;
    if (config.analysis.generatePRSummary) {
      const prAgent = orchestratorResult.agentResults.find((r) => r.agentName === "pr-summary");
      const fromAgent = prAgent?.metadata?.prSummary as PRSummary | undefined;
      prSummary = fromAgent ?? (await runChangeAnalysis(recon, config));
    }
    await onProgress?.({ stage: "change-analysis", status: "complete" });

    await onProgress?.({
      stage: "threat-synthesis",
      status: "running",
      detail: "Threat model & deduplication",
    });
    const threat = await runThreatSynthesis(tools, recon, findingsAfterLearnings, scan.summary, config);
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
        findings: findingsAfterLearnings,
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
    if (scan.partialFailure) {
      summaryOut = scan.scanErrorMessage
        ? `${summaryOut}\n\n[Scan warning] ${scan.scanErrorMessage}`
        : `${summaryOut}\n\n[Scan warning] One or more scan agents reported errors.`;
    }

    logAudit("audit", "pipeline_complete", {
      owner: input.owner,
      repo: input.repo,
      durationMs,
      partial: scan.partialFailure ? 1 : 0,
    });

    if (config.tracking.enabled && input.prNumber != null) {
      try {
        const { data: prRef } = await octokit.pulls.get({
          owner: input.owner,
          repo: input.repo,
          pull_number: input.prNumber,
        });
        await storeAuditPredictions(
          input.owner,
          input.repo,
          input.prNumber,
          prRef.head.sha,
          processed.findings,
        );
      } catch (e) {
        console.warn("[pipeline] storeAuditPredictions failed:", e);
      }
    }

    return {
      score: processed.score,
      grade: processed.grade,
      summary: summaryOut,
      phases,
      findings: processed.findings,
      threatModel: processed.threatModel,
      recon,
      prSummary: config.analysis.generatePRSummary ? prSummary : undefined,
      verdict: learningsMeta?.verdict,
      teamPatterns: learningsMeta?.teamPatterns,
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
