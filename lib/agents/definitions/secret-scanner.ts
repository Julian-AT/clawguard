import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import { FindingSchema, type Finding } from "@/lib/analysis/types";
import type { SecurityAgentDefinition, AgentContext, AgentResult } from "@/lib/agents/types";
import { registerAgent } from "@/lib/agents/registry";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

const AGENT_NAME = "secret-scanner" as const;
const REQUIRED_SKILLS = ["secret-scanning"] as const;

function buildPrompt(context: AgentContext): string {
  return [
    "## Task",
    "Detect secrets and credentials introduced or exposed in THIS pull request.",
    "Focus on ADDED lines in the diff. Use tools to read `.gitignore` and relevant config files if needed.",
    "",
    "## Pattern coverage",
    "Consider 50+ provider-style formats including: AWS (AKIA keys, secret access key patterns), GCP service account JSON, Azure storage keys, GitHub/GitLab/Bitbucket tokens, npm/pypi/rubygems tokens, Slack/Discord webhooks, Stripe keys, SendGrid/Mailgun, database URLs with passwords, private keys (BEGIN RSA/PRIVATE KEY), JWTs in code, generic high-entropy blobs on suspicious lines.",
    "",
    "## Analysis",
    "- Flag likely secrets with reasoning (pattern + entropy heuristic).",
    "- If something is a known example/placeholder (e.g. 'sk_test_0000'), downgrade severity or omit.",
    "- Check whether sensitive paths are covered by .gitignore; mis-ignored secrets are higher severity.",
    "",
    "## Diff",
    "<diff>",
    context.recon.diff.slice(0, 150_000),
    "</diff>",
    "",
    context.recon.secretPatternHints?.length
      ? "## Heuristic hints from pipeline\n" + context.recon.secretPatternHints.map((h) => `- ${h}`).join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const secretScannerAgent: SecurityAgentDefinition = {
  name: AGENT_NAME,
  description:
    "Scans PR diff for secret patterns, entropy anomalies, and .gitignore coverage for sensitive files.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 15,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;

    const baseInstructions = [
      "You are a secret-scanning specialist. Do not duplicate generic code vulnerabilities — only credential and secret exposure.",
      "Each confirmed or high-likelihood secret is a finding: file and line from the diff; use CWE-798 (hard-coded credentials) or CWE-321 (weak crypto for keys) where appropriate; OWASP often A07:2021 Identification and Authentication Failures or A02 for sensitive data exposure.",
      "Describe attackScenario: how an attacker could obtain and abuse the material.",
      "If no plausible secrets: return findings: [] and explain briefly.",
    ].join("\n");

    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const { tools } = await createBashTool({ sandbox: context.sandbox });
    const prompt = buildPrompt(context);

    try {
      const loop = new ToolLoopAgent({
        model: gateway(modelRef),
        tools,
        output: Output.object({ schema: OutputSchema }),
        stopWhen: stepCountIs(15),
        instructions,
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

registerAgent(secretScannerAgent);
