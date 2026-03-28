import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import { registerAgent } from "@/lib/agents/registry";
import { createOnStepFinish } from "@/lib/agents/step-hooks";
import type { AgentContext, AgentResult, SecurityAgentDefinition } from "@/lib/agents/types";
import { type Finding, FindingSchema, type ReconResult } from "@/lib/analysis/types";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

const AGENT_NAME = "api-security" as const;
const REQUIRED_SKILLS = ["api-security", "owasp-web-security"] as const;

const API_PATH_RE =
  /(\/api\/|\/routes?\/|route\.ts|router\.|handler\.ts|controller\.|server\.ts|trpc|graphql|\/app\/api\/|fastify|express|hono|elysia)/i;

function apiExcerpts(recon: ReconResult): string {
  if (!recon.fileExcerpts) return "(No excerpts; use tools to read route handlers.)";
  const entries = Object.entries(recon.fileExcerpts).filter(([path]) => API_PATH_RE.test(path));
  if (entries.length === 0) {
    return Object.entries(recon.fileExcerpts)
      .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
      .join("\n\n");
  }
  return entries.map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``).join("\n\n");
}

function buildPrompt(context: AgentContext): string {
  return [
    "## Task",
    "Analyze HTTP/API surface in this PR: authentication and authorization, session/JWT handling, rate limiting and abuse controls, input validation and content types, CORS, error handling that leaks internals, unsafe deserialization, mass assignment, IDOR on API resources, CSRF where cookie-based auth exists.",
    "Do not re-scan Docker/CI or dependency CVEs — other agents own those.",
    "Use tools to open related middleware, auth helpers, and shared validators when the diff references them.",
    "",
    "## Framework hints",
    context.recon.frameworkHints.join(", ") || "none",
    "",
    "## Excerpts (API-related when detectable)",
    apiExcerpts(context.recon),
    "",
    "## Diff",
    "<diff>",
    context.recon.diff.slice(0, 150_000),
    "</diff>",
  ].join("\n");
}

const apiSecurityAgent: SecurityAgentDefinition = {
  name: AGENT_NAME,
  description:
    "Focused review of API routes and handlers: auth, rate limits, validation, CORS, and error exposure.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 20,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;

    const baseInstructions = [
      "You are an API security specialist. Tie findings to concrete handlers or middleware in the diff.",
      "Each finding needs file, line, cweId, owaspCategory, description, attackScenario, confidence.",
      "Prefer actionable fixes (validation, authz checks, CORS tightening, consistent error shape).",
      "If the PR does not touch API code, return empty findings and a one-line summary.",
    ].join("\n");

    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const { tools } = await createBashTool({ sandbox: context.sandbox });
    const prompt = buildPrompt(context);
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
        summary: `Agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(apiSecurityAgent);
