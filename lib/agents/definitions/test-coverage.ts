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

const AGENT_NAME = "test-coverage" as const;
const REQUIRED_SKILLS = ["test-writing"] as const;

const testCoverageAgent: AgentDefinition = {
  name: AGENT_NAME,
  description:
    "Maps changed logic to tests: missing coverage, suggested cases, and signature drift risks.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 22,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const baseInstructions = [
      "You are a test engineer. Use parse_diff, ast_analyze, and bash to locate test files (*test*, *.spec.*, __tests__).",
      "Findings use category 'testing'. Suggest concrete test code in fix.after when possible.",
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
        summary: `Test coverage agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(testCoverageAgent);
