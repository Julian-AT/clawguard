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

const AGENT_NAME = "code-quality" as const;
const REQUIRED_SKILLS = ["code-smells", "code-quality"] as const;

const codeQualityAgent: AgentDefinition = {
  name: AGENT_NAME,
  description:
    "AST-backed code quality: complexity, nesting, long methods, smells, and refactor suggestions.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 22,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const baseInstructions = [
      "You are a staff engineer focused on maintainability and clarity.",
      "Use parse_diff, ast_analyze (with file path + full source from readFile/bash), and dependency_graph tools.",
      "Emit findings with category 'quality'. Omit cweId/owaspCategory/attackScenario unless tying to security.",
      "Set type to a short slug (e.g. high-complexity). Include concrete fix.before/fix.after when possible.",
      "Severity: HIGH for unmaintainable hotspots, MEDIUM for moderate smells, LOW/INFO for nits.",
    ].join("\n");
    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const prompt = [
      "## Task",
      "Review changed files for code smells and metrics from tools.",
      "",
      "## Diff (truncated)",
      context.recon.diff.slice(0, 100_000),
      "",
      "## File excerpts (keys = paths)",
      JSON.stringify(context.recon.fileExcerpts ?? {}, null, 0).slice(0, 80_000),
    ].join("\n");

    const tools = await mergeBashAndClawTools(context);
    const maxSteps = Math.min(22, context.config.scanning.maxSteps);
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
        summary: `Code quality agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(codeQualityAgent);
