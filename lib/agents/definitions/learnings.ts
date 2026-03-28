import { gateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import { z } from "zod";
import { registerAgent } from "@/lib/agents/registry";
import type { AgentContext, AgentDefinition, AgentResult } from "@/lib/agents/types";
import {
  type Finding,
  FindingSchema,
  ReviewVerdictResultSchema,
  TeamPatternSchema,
} from "@/lib/analysis/types";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  finalFindings: z.array(FindingSchema),
  verdict: ReviewVerdictResultSchema,
  teamPatterns: z.array(TeamPatternSchema),
  summary: z.string(),
});

const AGENT_NAME = "learnings" as const;

/** All specialist agents that must complete before synthesis (excluding learnings). */
const LEARNINGS_DEPENDS_ON = [
  "security-scan",
  "dependency-audit",
  "secret-scanner",
  "infrastructure-review",
  "api-security",
  "compliance-auditor",
  "pentest",
  "code-quality",
  "architecture",
  "test-coverage",
  "documentation",
  "performance",
  "pr-summary",
] as const;

const learningsAgent: AgentDefinition = {
  name: AGENT_NAME,
  description:
    "Applies repo learnings, surfaces team patterns, assigns verdict, and returns final finding list.",
  requiredSkills: ["pr-review-tone"],
  requiredTools: ["fs:read"],
  maxSteps: 1,
  dependsOn: [...LEARNINGS_DEPENDS_ON],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const prior = context.priorFindings;
    const truncated = prior.slice(0, 120);
    const baseInstructions = [
      "You consolidate the multi-agent review.",
      "Apply learnings: if a learning action is suppress and the finding matches the pattern, remove it from finalFindings.",
      "Escalate repeated themes in teamPatterns. Set verdict: approve | request-changes | comment with clear reasoning.",
      "Preserve finding ids when possible. Do not invent new security issues.",
    ].join("\n");
    const instructions = injectSkills(baseInstructions, AGENT_NAME, ["pr-review-tone"]);

    const prompt = [
      instructions,
      "",
      "## Prior findings (JSON, possibly truncated)",
      JSON.stringify(truncated, null, 0).slice(0, 200_000),
      "",
      "## Learnings block",
      context.learningsBlock ?? "(none)",
    ].join("\n");

    try {
      const { object } = await generateObject({
        model: gateway(modelRef),
        schema: OutputSchema,
        prompt,
        abortSignal: context.abortSignal,
      });

      return {
        agentName: AGENT_NAME,
        findings: [],
        summary: object.summary,
        metadata: {
          finalFindings: object.finalFindings as Finding[],
          verdict: object.verdict,
          teamPatterns: object.teamPatterns,
        },
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        agentName: AGENT_NAME,
        findings: [],
        summary: `Learnings agent failed: ${err instanceof Error ? err.message : String(err)}`,
        metadata: {
          finalFindings: prior,
          verdict: {
            verdict: "comment" as const,
            reasoning: "Learnings step failed; showing unfiltered findings.",
          },
          teamPatterns: [],
        },
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(learningsAgent);
