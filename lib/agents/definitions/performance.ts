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

const AGENT_NAME = "performance" as const;
const REQUIRED_SKILLS = ["performance-patterns", "code-quality"] as const;

const performanceAgent: AgentDefinition = {
  name: AGENT_NAME,
  description:
    "Performance anti-patterns: N+1 queries, blocking in async, unbounded work, heavy imports, asset bloat.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 20,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const baseInstructions = [
      "You are a performance engineer. Use ast_analyze, semgrep_scan, and bash to inspect hot paths.",
      "Findings use category 'performance'. Tie each issue to observable cost (latency, CPU, memory).",
    ].join("\n");
    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const prompt = [
      "## Diff",
      context.recon.diff.slice(0, 120_000),
      "",
      "## Excerpts",
      JSON.stringify(context.recon.fileExcerpts ?? {}, null, 0).slice(0, 60_000),
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
        summary: `Performance agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(performanceAgent);
