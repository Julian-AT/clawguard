import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import { buildSecurityScanPrompt } from "@/lib/analysis/recon-context";
import { registerAgent } from "@/lib/agents/registry";
import { createOnStepFinish } from "@/lib/agents/step-hooks";
import type { AgentContext, AgentResult, SecurityAgentDefinition } from "@/lib/agents/types";
import { type Finding, FindingSchema } from "@/lib/analysis/types";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

const AGENT_NAME = "security-scan" as const;
const REQUIRED_SKILLS = ["owasp-web-security", "code-quality", "reporting"] as const;

const securityScanAgent: SecurityAgentDefinition = {
  name: AGENT_NAME,
  description:
    "Core vulnerability scanner: code-level security issues in the PR diff with policy alignment.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 30,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;
    const maxSteps = Math.min(
      30,
      context.config.scanning.maxSteps,
    );
    const depthHint =
      context.config.scanning.depth === "quick"
        ? "Keep analysis faster and slightly less exhaustive."
        : context.config.scanning.depth === "deep"
          ? "Be exhaustive; consider subtle and chained issues."
          : "";

    const baseInstructions = [
      ...(depthHint ? [depthHint] : []),
      "You are a principal application security engineer focused ONLY on code-level vulnerabilities in the changed code.",
      "Do not duplicate dependency-CVE, secret-leak, or pure infra misconfiguration work — other agents cover those.",
      "Use tools to read additional files in the sandbox only when the diff and excerpts are insufficient.",
      "Find REAL security issues. Prefer evidence from excerpts and diff.",
      "Enforce custom policies from the repository when listed.",
      "",
      "For each finding you MUST output:",
      "- severity, type, title, file, line, cweId, owaspCategory (OWASP Top 10 2021)",
      "- description, attackScenario, confidence",
      "- dataFlow with nodes (source/transform/sink) AND mermaidDiagram (valid Mermaid graph LR or TB) when applicable",
      "- fix with before/after snippets and explanation when you can suggest one",
      "- complianceMapping when applicable",
      "- remediationEffort: trivial | small | medium | large",
      "",
      "Avoid duplicate issues. Ignore test-only noise unless policies require it.",
    ].join("\n");

    const fullInstructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const shortInstructions = injectSkills(
      [
        "You are a security engineer. Output ONLY valid JSON matching the schema.",
        "List security issues in the PR diff with file paths and line numbers from the changed code.",
        "Be concise; include CWE and OWASP category per finding.",
      ].join("\n"),
      AGENT_NAME,
      [...REQUIRED_SKILLS],
    );

    const { tools } = await createBashTool({ sandbox: context.sandbox });
    const prompt = buildSecurityScanPrompt(context.recon, context.policies, {
      learnings: context.learningsBlock,
      knowledge: context.knowledgeBlock,
    });

    const onStepFinish = createOnStepFinish(AGENT_NAME, context);

    async function runOnce(instructions: string): Promise<{ findings: Finding[]; summary: string }> {
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
        findings: result.output.findings as Finding[],
        summary: result.output.summary,
      };
    }

    try {
      const out = await runOnce(fullInstructions);
      return {
        agentName: AGENT_NAME,
        findings: out.findings,
        summary: out.summary,
        durationMs: Date.now() - start,
      };
    } catch (firstError) {
      console.error("[security-scan agent] Agent error (first attempt):", firstError);
      if (context.config.scanning.maxRetries <= 0) {
        const msg = firstError instanceof Error ? firstError.message : String(firstError);
        return {
          agentName: AGENT_NAME,
          findings: [],
          summary:
            "Security scan could not produce structured output. Check deployment logs or try again.",
          durationMs: Date.now() - start,
          error: msg,
        };
      }
      try {
        const out = await runOnce(shortInstructions);
        return {
          agentName: AGENT_NAME,
          findings: out.findings,
          summary: `${out.summary}\n\n[Scan note] First attempt failed; retry succeeded. (${firstError instanceof Error ? firstError.message : String(firstError)})`,
          durationMs: Date.now() - start,
          metadata: { partialRetry: true },
        };
      } catch (secondError) {
        const msg = secondError instanceof Error ? secondError.message : String(secondError);
        return {
          agentName: AGENT_NAME,
          findings: [],
          summary:
            "Security scan could not produce structured output after retry. Check deployment logs or try again.",
          durationMs: Date.now() - start,
          error: msg,
        };
      }
    }
  },
};

registerAgent(securityScanAgent);
