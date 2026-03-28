import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { PhaseResultSchema, type PhaseResult } from "./types";

/**
 * Phase 3: Threat Model (SCAN-04)
 *
 * Performs attack surface analysis and threat modeling. Receives Phase 1 (code quality)
 * and Phase 2 (vulnerability scan) summaries as context to identify compound risks
 * and attack paths that span multiple findings.
 */
export async function runThreatModel(
  tools: Record<string, any>,
  diff: string,
  phase1Summary: string,
  phase2Summary: string
): Promise<PhaseResult> {
  const agent = new ToolLoopAgent({
    model: gateway("anthropic/claude-sonnet-4.6"),
    tools,
    output: Output.object({ schema: PhaseResultSchema }),
    stopWhen: stepCountIs(25),
    instructions: [
      "You are a threat modeling specialist performing attack surface analysis.",
      "",
      "Based on the PR changes and findings from Phase 1 (code quality) and Phase 2 (vulnerability scan),",
      "perform comprehensive threat modeling.",
      "",
      "Focus areas:",
      "- Attack surface mapping: identify new endpoints, data inputs, trust boundaries introduced by the PR",
      "- Attack path analysis: trace how individual vulnerabilities can be chained for compound exploits",
      "- Compound risk assessment: evaluate how Phase 1 quality issues + Phase 2 vulnerabilities interact",
      "  (e.g., missing input validation + SQL injection = higher compound risk)",
      "- Trust boundary violations: identify where data crosses trust boundaries without proper validation",
      "- Authentication/authorization boundary analysis: map auth boundaries and identify gaps",
      "- Data flow threats: trace sensitive data across component boundaries and identify exposure points",
      "- Privilege escalation paths: identify how an attacker could escalate privileges through the changes",
      "- Lateral movement opportunities: identify how compromising one component enables access to others",
      "",
      "For each threat finding:",
      "- Frame as an attack scenario with a realistic attacker motivation",
      "- Identify the attack surface (entry point, exposed functionality)",
      "- Describe the attack path (step-by-step exploitation)",
      "- Assess risk with severity (CRITICAL/HIGH/MEDIUM/LOW/INFO)",
      "- Provide CWE ID and OWASP Top 10 2021 category mappings",
      "- Trace data flow: source -> transform -> sink",
      "- Provide before/after fix code snippets where applicable",
      "- Map to compliance frameworks (PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS)",
      "",
      "Consider how Phase 1 quality issues and Phase 2 vulnerabilities interact:",
      "- A code quality issue (e.g., missing error handling) combined with a vulnerability (e.g., injection)",
      "  may create a higher compound risk than either alone",
      "- Map the relationships between findings to identify systemic issues",
      "",
      "Set confidence based on certainty: 'HIGH' for definite threats, 'MEDIUM' for likely, 'LOW' for possible.",
      "",
      "Use bash tools to explore the codebase architecture, trace trust boundaries, and map attack surfaces.",
      "Output format: Provide a brief summary and detailed findings array using the structured output schema.",
    ].join("\n"),
  });

  try {
    const result = await agent.generate({
      prompt: [
        "Perform threat modeling on this pull request based on the code changes and prior analysis phases.",
        "Use bash tools to explore the repository architecture and map attack surfaces.",
        "",
        "<phase1_context>",
        phase1Summary,
        "</phase1_context>",
        "",
        "<phase2_context>",
        phase2Summary,
        "</phase2_context>",
        "",
        "<diff>",
        diff,
        "</diff>",
      ].join("\n"),
    });
    return result.output;
  } catch (error) {
    console.error("[phase-3] Agent error:", error);
    return {
      summary: "Phase 3 analysis could not produce structured output",
      findings: [],
    };
  }
}
