import type { ToolPermission } from "@/lib/tools/types";
import type { Finding, ThreatModel, ReconResult } from "@/lib/analysis/types";

export interface AgentResult {
  agentName: string;
  findings: Finding[];
  summary: string;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type AgentStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface SecurityAgentDefinition {
  name: string;
  description: string;
  requiredSkills: string[];
  requiredTools: ToolPermission[];
  maxSteps: number;
  /** Agent names this depends on (must complete first) */
  dependsOn: string[];
  /** The agent's execute function */
  execute(context: AgentContext): Promise<AgentResult>;
}

export interface AgentContext {
  runId: string;
  agentId: string;
  sandbox: import("@vercel/sandbox").Sandbox;
  recon: ReconResult;
  config: import("@/lib/config/schemas").ClawGuardConfig;
  policies: import("@/lib/config/schemas").PolicyRule[];
  /** Findings from completed agents (for agents that depend on others) */
  priorFindings: Finding[];
  /** Shared memory between agents within a pipeline run */
  memory: AgentMemory;
  /** Signal to abort */
  abortSignal?: AbortSignal;
}

export interface AgentMemory {
  get<T = unknown>(key: string): T | undefined;
  set(key: string, value: unknown): void;
  getFindings(agentName: string): Finding[];
  addFindings(agentName: string, findings: Finding[]): void;
  /** All findings accumulated across agents in this run */
  getAllFindings(): Finding[];
}

export interface OrchestratorResult {
  findings: Finding[];
  threatModel?: ThreatModel;
  summary: string;
  agentResults: AgentResult[];
  durationMs: number;
  errors: Array<{ agent: string; error: string }>;
}
