import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import { registerAgent } from "@/lib/agents/registry";
import type { AgentContext, AgentResult, SecurityAgentDefinition } from "@/lib/agents/types";
import { type Finding, FindingSchema } from "@/lib/analysis/types";
import type { PolicyRule } from "@/lib/config/schemas";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

const AGENT_NAME = "compliance-auditor" as const;
const REQUIRED_SKILLS = ["reporting"] as const;

function policiesBlock(policies: PolicyRule[]): string {
  if (policies.length === 0) return "(No custom policies in .clawguard/policies.yml)";
  return policies.map((p) => `- [${p.severity}] ${p.name}: ${p.rule}`).join("\n");
}

function serializeFindings(findings: Finding[], maxChars: number): string {
  const payload = JSON.stringify(
    findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      type: f.type,
      title: f.title,
      file: f.file,
      line: f.line,
      cweId: f.cweId,
      owaspCategory: f.owaspCategory,
      description: f.description,
      complianceMapping: f.complianceMapping,
    })),
  );
  if (payload.length <= maxChars) return payload;
  return `${payload.slice(0, maxChars)}\n... (truncated)`;
}

function buildPrompt(context: AgentContext): string {
  return [
    "## Task",
    "Map prior security findings to compliance frameworks. Do not invent new technical vulnerabilities — synthesize compliance posture from the inputs.",
    "",
    "## Frameworks",
    "Produce complianceMapping on each output finding with specific control references where possible:",
    "- PCI-DSS (e.g. req 6.5.x, 8.x)",
    "- SOC 2 (CC6.x, CC7.x trust criteria)",
    "- HIPAA (§164.308/310 administrative; technical safeguards)",
    "- NIST (800-53 families like AC, IA, SI, SC)",
    "- OWASP ASVS chapters/sections",
    "",
    "## Output shape",
    "Emit one or more findings representing aggregated compliance gaps or control failures, OR enrich by emitting findings that mirror major prior issues with complianceMapping fully populated.",
    "Each finding must satisfy the schema (file/line may reference the original finding's file/line).",
    "",
    "## Custom policies",
    policiesBlock(context.policies),
    "",
    "## Prior findings (from other agents)",
    serializeFindings(context.priorFindings, 100_000),
    "",
    "## Optional: org frameworks from config",
    `Report.frameworks: ${context.config.report.frameworks.join(", ") || "default set"}`,
  ].join("\n");
}

const complianceAuditorAgent: SecurityAgentDefinition = {
  name: AGENT_NAME,
  description:
    "Maps consolidated findings to PCI-DSS, SOC 2, HIPAA, NIST, and OWASP ASVS control language.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read"],
  maxSteps: 10,
  dependsOn: ["security-scan", "dependency-audit", "secret-scanner"],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;

    const baseInstructions = [
      "You are a compliance analyst. You only receive prior findings and policies — no duplicate scanning.",
      "If priorFindings is empty, return findings: [] and summarize that no compliance mapping is possible yet.",
      "When prior findings exist, prioritize CRITICAL/HIGH for mapping; merge overlapping issues into a single compliance finding when it improves clarity.",
      "Titles should name the control theme (e.g. 'Access control gap — SOC2 CC6.1 / ASVS V4').",
    ].join("\n");

    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const { tools } = await createBashTool({ sandbox: context.sandbox });
    const prompt = buildPrompt(context);

    try {
      const loop = new ToolLoopAgent({
        model: gateway(modelRef),
        tools,
        output: Output.object({ schema: OutputSchema }),
        stopWhen: stepCountIs(10),
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

registerAgent(complianceAuditorAgent);
