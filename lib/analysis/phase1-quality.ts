import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { PhaseResultSchema, type PhaseResult } from "./types";

/**
 * Phase 1: Code Quality Review (SCAN-02)
 *
 * Analyzes PR diff for code quality issues with security implications.
 * Focuses on code smells, complexity, error handling gaps, input validation,
 * architectural impact, and security-relevant design issues.
 */
export async function runQualityReview(
  tools: Record<string, any>,
  diff: string
): Promise<PhaseResult> {
  const agent = new ToolLoopAgent({
    model: gateway("anthropic/claude-sonnet-4.6"),
    tools,
    output: Output.object({ schema: PhaseResultSchema }),
    stopWhen: stepCountIs(25),
    instructions: [
      "You are a senior code quality and security reviewer.",
      "",
      "Analyze the PR diff for code quality issues with security implications.",
      "",
      "Focus areas:",
      "- Code smells that indicate security weaknesses (e.g., overly complex logic hiding bugs)",
      "- Cyclomatic complexity making code hard to audit",
      "- Error handling gaps (missing try/catch, swallowed errors, generic catches)",
      "- Input validation patterns (missing, incomplete, or incorrect validation)",
      "- Architectural impact (new attack surface, trust boundary changes)",
      "- Security-relevant design issues (singleton patterns hiding state, mutable globals)",
      "- Logging/debugging code that may leak sensitive data",
      "- Hardcoded values that should be configurable",
      "",
      "For each finding:",
      "- Assign severity: CRITICAL, HIGH, MEDIUM, LOW, or INFO",
      "- Identify the CWE ID (e.g., CWE-209 for error information exposure)",
      "- Map to OWASP Top 10 2021 category (e.g., A04:2021-Insecure Design)",
      "- Describe the issue with a realistic attack scenario",
      "- Trace data flow: source -> transform -> sink",
      "- Provide before/after fix code snippets",
      "- Map to compliance frameworks where applicable (PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS)",
      "",
      "Set confidence to 'high' when certain, 'medium' when likely, 'low' when possible but needs manual review.",
      "",
      "Use the bash tools to explore the full file context around changed lines for deeper understanding.",
      "Output format: Provide a brief summary and detailed findings array using the structured output schema.",
    ].join("\n"),
  });

  try {
    const result = await agent.generate({
      prompt: [
        "Analyze this pull request diff for code quality issues with security implications.",
        "Use bash tools to explore the repository and understand the full context around changed lines.",
        "",
        "<diff>",
        diff,
        "</diff>",
      ].join("\n"),
    });
    return result.output;
  } catch (error) {
    console.error("[phase-1] Agent error:", error);
    return {
      summary: "Phase 1 analysis could not produce structured output",
      findings: [],
    };
  }
}
