import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import { mergeBashAndClawTools } from "@/lib/agents/helpers/merge-tools";
import { registerAgent } from "@/lib/agents/registry";
import { createOnStepFinish } from "@/lib/agents/step-hooks";
import type { AgentContext, AgentDefinition, AgentResult } from "@/lib/agents/types";
import { type PRSummary, PRSummarySchema } from "@/lib/analysis/types";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  prSummary: PRSummarySchema,
  walkthroughNotes: z.string(),
});

const AGENT_NAME = "pr-summary" as const;
const REQUIRED_SKILLS = ["git-diff-reading", "pr-review-tone"] as const;

const prSummaryAgent: AgentDefinition = {
  name: AGENT_NAME,
  description:
    "Human-readable PR walkthrough: grouped by concern, changelog title, complexity, sequence diagrams.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 18,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const baseInstructions = [
      "You are a senior engineer writing the definitive PR walkthrough for reviewers.",
      "Use parse_diff and dependency_graph/generate_diagram when they clarify flows.",
      "Fill prSummary per schema: narrative, sequenceDiagrams, dependencyImpact, breakingChanges, complexity.",
      "walkthroughNotes: bullet list grouped by logical concern (not by file).",
    ].join("\n");
    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const depHint = context.recon.dependencyGraph
      ? JSON.stringify(context.recon.dependencyGraph, null, 2)
      : "(no graph)";
    const prompt = [
      "## Recon",
      `Languages: ${context.recon.languages.join(", ")}`,
      `Frameworks: ${context.recon.frameworkHints.join(", ")}`,
      `Changed files: ${context.recon.changedFiles.map((f) => f.path).join(", ")}`,
      "",
      "## Dependency context",
      depHint,
      "",
      "## Diff (truncated)",
      context.recon.diff.slice(0, 100_000),
    ].join("\n");

    const tools = await mergeBashAndClawTools(context);
    const maxSteps = Math.min(18, context.config.scanning.maxSteps);
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
      const prSummary = result.output.prSummary as PRSummary;
      return {
        agentName: AGENT_NAME,
        findings: [],
        summary: result.output.walkthroughNotes,
        metadata: { prSummary },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        agentName: AGENT_NAME,
        findings: [],
        summary: `PR summary agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(prSummaryAgent);
