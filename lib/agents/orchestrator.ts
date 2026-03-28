import { randomUUID } from "node:crypto";
import type { Sandbox } from "@vercel/sandbox";
import type { ReconResult } from "@/lib/analysis/types";
import type { ClawGuardConfig, PolicyRule } from "@/lib/config/schemas";
import { handleError } from "@/lib/error-handler";
import { PipelineMemory } from "./memory";
import { getAgent, getAllAgents } from "./registry";
import type { AgentContext, AgentResult, OrchestratorResult, AgentDefinition } from "./types";

export interface OrchestratorInput {
  runId: string;
  sandbox: Sandbox;
  recon: ReconResult;
  config: ClawGuardConfig;
  policies: PolicyRule[];
  /** For learnings/memory tools */
  owner?: string;
  repo?: string;
  agentNames?: string[];
  abortSignal?: AbortSignal;
  learningsBlock?: string;
  knowledgeBlock?: string;
  /** SSE / report: agent lifecycle, tools, findings */
  onStreamEvent?: (event: string, payload: unknown) => void;
  /** Pipeline progress: per-agent step */
  onAgentStep?: (info: { agentName: string; stepCount: number; detail?: string }) => void;
}

// Topological sort: returns layers of agents that can run in parallel
function buildExecutionLayers(agents: AgentDefinition[]): AgentDefinition[][] {
  const nameSet = new Set(agents.map((a) => a.name));
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();
  const agentMap = new Map<string, AgentDefinition>();

  for (const agent of agents) {
    agentMap.set(agent.name, agent);
    const deps = agent.dependsOn.filter((d) => nameSet.has(d));
    inDegree.set(agent.name, deps.length);
    for (const dep of deps) {
      if (!graph.has(dep)) graph.set(dep, []);
      graph.get(dep)?.push(agent.name);
    }
  }

  const layers: AgentDefinition[][] = [];
  let ready = agents.filter((a) => (inDegree.get(a.name) ?? 0) === 0);

  while (ready.length > 0) {
    layers.push(ready);
    const next: AgentDefinition[] = [];
    for (const agent of ready) {
      for (const dependent of graph.get(agent.name) ?? []) {
        const newDeg = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDeg);
        if (newDeg === 0) {
          const depAgent = agentMap.get(dependent);
          if (depAgent) next.push(depAgent);
        }
      }
    }
    ready = next;
  }

  return layers;
}

export class AgentOrchestrator {
  async run(input: OrchestratorInput): Promise<OrchestratorResult> {
    const start = Date.now();
    const memory = new PipelineMemory();
    const agentResults: AgentResult[] = [];
    const errors: Array<{ agent: string; error: string }> = [];

    // Resolve which agents to run
    let agents: AgentDefinition[];
    if (input.agentNames?.length) {
      agents = input.agentNames
        .map((n) => getAgent(n))
        .filter((a): a is AgentDefinition => a !== undefined);
    } else {
      agents = getAllAgents();
    }

    if (agents.length === 0) {
      return {
        findings: [],
        summary: "No agents configured to run.",
        agentResults: [],
        durationMs: Date.now() - start,
        errors: [],
      };
    }

    const layers = buildExecutionLayers(agents);

    for (const layer of layers) {
      if (input.abortSignal?.aborted) break;

      const layerPromises = layer.map(async (agentDef) => {
        const agentId = randomUUID();

        input.onStreamEvent?.("agent:started", {
          agentName: agentDef.name,
          runId: input.runId,
        });

        const context: AgentContext = {
          runId: input.runId,
          agentId,
          sandbox: input.sandbox,
          recon: input.recon,
          config: input.config,
          policies: input.policies,
          owner: input.owner,
          repo: input.repo,
          priorFindings: memory.getAllFindings(),
          memory,
          abortSignal: input.abortSignal,
          learningsBlock: input.learningsBlock,
          knowledgeBlock: input.knowledgeBlock,
          onStreamEvent: input.onStreamEvent,
          onAgentStep: input.onAgentStep,
        };

        const agentStart = Date.now();
        try {
          const result = await agentDef.execute(context);

          memory.addFindings(agentDef.name, result.findings);

          if (result.error) {
            input.onStreamEvent?.("agent:error", {
              agentName: agentDef.name,
              error: result.error,
              runId: input.runId,
            });
          } else {
            input.onStreamEvent?.("agent:completed", {
              agentName: agentDef.name,
              durationMs: result.durationMs,
              findingCount: result.findings.length,
              runId: input.runId,
            });
            for (const f of result.findings) {
              input.onStreamEvent?.("finding:discovered", {
                severity: f.severity,
                type: f.type,
                file: f.file,
                line: f.line,
              });
            }
          }

          return result;
        } catch (err) {
          const durationMs = Date.now() - agentStart;
          const message = err instanceof Error ? err.message : String(err);

          handleError(err, {
            runId: input.runId,
            agentName: agentDef.name,
            operation: "agent:execute",
          });

          errors.push({ agent: agentDef.name, error: message });

          input.onStreamEvent?.("agent:error", {
            agentName: agentDef.name,
            error: message,
            runId: input.runId,
          });

          return {
            agentName: agentDef.name,
            findings: [],
            summary: `Agent ${agentDef.name} failed: ${message}`,
            durationMs,
            error: message,
          } satisfies AgentResult;
        }
      });

      const results = await Promise.allSettled(layerPromises);

      for (const result of results) {
        if (result.status === "fulfilled") {
          agentResults.push(result.value);
        }
        // rejected should not happen (caught above), but handle just in case
        if (result.status === "rejected") {
          const msg =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          errors.push({ agent: "unknown", error: msg });
        }
      }
    }

    const allFindings = memory.getAllFindings();

    return {
      findings: allFindings,
      summary: agentResults
        .filter((r) => !r.error)
        .map((r) => r.summary)
        .join("\n\n"),
      agentResults,
      durationMs: Date.now() - start,
      errors,
    };
  }
}
