import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import { mergeBashAndClawTools } from "@/lib/agents/helpers/merge-tools";
import { registerAgent } from "@/lib/agents/registry";
import { createOnStepFinish } from "@/lib/agents/step-hooks";
import type { AgentContext, AgentDefinition, AgentResult } from "@/lib/agents/types";
import { type Finding, FindingSchema } from "@/lib/analysis/types";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

const AGENT_NAME = "architecture" as const;
const REQUIRED_SKILLS = ["architecture-patterns"] as const;

const architectureAgent: AgentDefinition = {
  name: AGENT_NAME,
  description:
    "Dependency graphs, circular imports, coupling, blast radius, and Mermaid architecture diagrams.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 20,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const baseInstructions = [
      "You are a software architect reviewing structural impact of the PR.",
      "Use dependency_graph and generate_diagram tools. Put Mermaid in dataFlow.mermaidDiagram when useful.",
      "Findings use category 'architecture'. Describe blast radius and coupling; severity by risk of change ripple.",
    ].join("\n");
    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const prompt = [
      "## Diff",
      context.recon.diff.slice(0, 100_000),
      "",
      "## Dependency graph (heuristic)",
      context.recon.dependencyGraph
        ? JSON.stringify(context.recon.dependencyGraph, null, 2).slice(0, 40_000)
        : "(none)",
    ].join("\n");

    const tools = await mergeBashAndClawTools(context);
    const maxSteps = Math.min(20, context.config.scanning.maxSteps);
    const onStepFinish = createOnStepFinish(AGENT_NAME, context);

    try {
      const loop = new ToolLoopAgent({
        model: gateway(modelRef),
        tools,
        output: Output.object({ schema: OutputSchema }),
        stopWhen: stepCountIs(maxSteps),
        instructions,
        onStepFinish,
      });
      const result = await loop.generate({
        prompt,
        abortSignal: context.abortSignal,
      });
      return {
        agentName: AGENT_NAME,
        findings: result.output.findings as Finding[],
        summary: result.output.summary,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        agentName: AGENT_NAME,
        findings: [],
        summary: `Architecture agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(architectureAgent);
